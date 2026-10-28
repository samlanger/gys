// Applies supabase/migrations to an in-memory Postgres (PGlite) with a tiny Supabase auth shim,
// then exercises capacity, private access, RLS write blocks, waitlist promotion, adaptation and review.
// Usage: npm run test:sql
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const dir = process.argv[2];
const db = new PGlite();
// Minimal Supabase shim: auth schema, auth.uid(), roles.
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  create role anon; create role authenticated;
  grant usage on schema public to anon, authenticated;
`);
for (const f of fs.readdirSync(dir).sort()) {
  try { await db.exec(fs.readFileSync(`${dir}/${f}`, "utf8").replace("create extension if not exists pgcrypto;", () => "create function gen_random_bytes(n int) returns bytea language sql as $$ select decode(md5(random()::text) || md5(random()::text), 'hex') $$;")); console.log("applied", f); }
  catch (e) { console.error("FAILED", f, e.message); process.exit(1); }
}
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated, anon;
  grant execute on all functions in schema public to authenticated;`);
let failed = 0;
const ok = (cond, label) => { console.log(cond ? "✓" : "✗", label); if (!cond) failed++; };
const host = "11111111-1111-1111-1111-111111111111";
const ids = Array.from({ length: 6 }, (_, i) => `00000000-0000-0000-0000-00000000000${i}`);
for (const u of [host, ...ids]) await db.query("insert into auth.users values ($1)", [u]);
await db.query("insert into profiles (id, name, adult_confirmed, host_status) values ($1,'Host',true,'approved')", [host]);
for (const u of ids) await db.query("insert into profiles (id, name, adult_confirmed) values ($1,'P',true)", [u]);
const as = async (u, sql, params = []) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.sub', '${u}', false);`);
  try { return await db.query(sql, params); } finally { await db.exec("reset role;"); }
};
const a = (await as(host, `insert into actions (slug, host_id, title, starts_at, duration_mins, capacity, campaign_code, area_label, venue_name, allow_adaptation)
  values ('t-1', $1, 'Test', now() + interval '3 days', 120, 3, 'ABC123', 'Area', 'Library', true) returning id`, [host])).rows[0].id;
await as(host, "insert into action_private values ($1, '1 Secret St', 'side door')", [a]);
await as(host, "insert into role_slots (action_id, name, capacity) values ($1, 'Welcomer', 1)", [a]);
ok((await as(host, "select publish_action($1) s", [a])).rows[0].s === "published", "reviewed host publishes directly");
for (const u of ids) await as(u, "select join_action($1)", [a]);
const counts = (await db.query("select status, count(*)::int n from rsvps group by status order by status")).rows;
ok(JSON.stringify(counts) === '[{"status":"confirmed","n":3},{"status":"waitlisted","n":3}]', "capacity 3: 3 confirmed, 3 waitlisted");
// Private details: confirmed yes, waitlisted no, anon no.
const confirmedUser = (await db.query("select user_id from rsvps where status='confirmed' limit 1")).rows[0].user_id;
const waitUser = (await db.query("select user_id from rsvps where status='waitlisted' limit 1")).rows[0].user_id;
ok((await as(confirmedUser, "select * from action_private")).rows.length === 1, "confirmed participant sees address");
ok((await as(waitUser, "select * from action_private")).rows.length === 0, "waitlisted person cannot see address");
// Direct RSVP insert is blocked by RLS.
try { await as(waitUser, "insert into rsvps (action_id, user_id, status) values ($1,$2,'confirmed')", [a, waitUser]); ok(false, "direct RSVP insert blocked"); }
catch { ok(true, "direct RSVP insert blocked"); }
// Leaving promotes the waitlist.
await as(confirmedUser, "select leave_action($1)", [a]);
ok(JSON.stringify((await db.query("select status, count(*)::int n from rsvps group by status order by status")).rows) === '[{"status":"confirmed","n":3},{"status":"waitlisted","n":2},{"status":"cancelled","n":1}]', "leaving promotes the waitlist");
// Feedback aggregate under 5 hidden.
ok((await as(host, "select * from feedback_aggregate($1)", [a])).rows[0].avg_worth_it === null, "feedback aggregate hidden under 5 responses");
// Adaptation copies no private data.
const d = (await as(ids[5], "select (adapt_action($1)).*", [a])).rows[0];
const priv = (await db.query("select * from action_private where action_id=$1", [d.id])).rows[0];
ok(priv.venue_address === "" && d.venue_name === "" && d.lineage_root_id === a, "adaptation copies no private data and keeps lineage");
await as(ids[5], "update actions set area_label='X', venue_name='Y', starts_at=now()+interval '5 days' where id=$1", [d.id]);
await as(ids[5], "update action_private set venue_address='2 Road' where action_id=$1", [d.id]);
ok((await as(ids[5], "select publish_action($1) s", [d.id])).rows[0].s === "in_review", "unreviewed host goes to pilot review");
// Host can't self-publish by editing status.
const r = await as(ids[5], "update actions set status='published' where id=$1 returning id", [d.id]).catch((e) => ({ rows: [], err: e.message }));
ok(r.rows.length === 0, "host cannot self-publish by editing status");
if (failed) process.exit(1);
