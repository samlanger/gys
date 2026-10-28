# Before real people use it

The demo is complete end to end; these are the remaining dependencies for a live pilot.

## Must have

1. **Supabase project + Postgres adapter.** The schema, RLS and rule-enforcing functions are in `supabase/migrations/` and checked by `npm run test:sql`. Still to do: implement the data layer against Supabase (a `Store` that calls the `join_action`, `publish_action`, `adapt_action`, … RPCs and RLS-protected tables) and set `DATA_BACKEND=supabase`. Today `getStore()` refuses to start in that mode rather than silently using demo data.
2. **Real sign-in.** Swap the demo name+email sign-in for Supabase Auth magic links (or OTP) and a `profiles` row on first sign-in, keeping the 18+ confirmation.
3. **Email delivery** for sign-in links, place confirmations, waitlist promotion, cancellations and reminders (respecting notification settings). In-app notifications already exist.
4. **Secrets & hosting.** A long random `SESSION_SECRET`; the Supabase service-role key kept server-side only; HTTPS; `NEXT_PUBLIC_APP_URL` set to the real domain (share links and calendar files use it).
5. **Legal & policy.** Privacy notice, terms, data-processing basis, retention periods, and a venue/host agreement for the pilot.
6. **Operator accounts.** Set `is_operator = true` for named pilot staff directly in the database.
7. **Background jobs.** Reminders the day before, and auto-processing of stale invitations (expiry is already enforced at read time).

## Should have

- Rate limiting on sign-in, join and report endpoints.
- Accessibility review with real assistive-technology users (the app uses semantic HTML, labels, focus outlines, reduced-motion support and 390px-first layouts, but hasn’t had an external audit).
- Error monitoring and uptime alerts.
- Backups and a tested restore.
- Content moderation tooling beyond removing messages (e.g. hiding stories, editing reported plans).

## Deliberately not built (per the brief)

Funded currency or credits, payments, global feed, formal governance, universal reputation, native social publishing (sharing uses X’s composer, device share sheets and download/copy only), autonomous agents, 3D world.

## Social platforms

No platform API approval is needed for what’s built. Native publishing would later require each platform’s current permissions, account eligibility, app review and policies.
