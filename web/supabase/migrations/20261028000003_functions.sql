-- Rule-enforcing operations. Each runs as a single transaction.

-- Join with capacity safety: the action row is locked, so simultaneous joins
-- are serialised and can never overfill a plan or a role.
create or replace function join_action(p_action uuid, p_invite text default null, p_role uuid default null,
                                       p_code text default null, p_channel channel default null)
returns rsvps language plpgsql security definer set search_path = public as $$
declare
  a actions;
  me profiles;
  inv invitations;
  existing rsvps;
  confirmed int;
  r rsvps;
  role_room boolean;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then raise exception 'unauthenticated'; end if;
  if not me.adult_confirmed then raise exception 'adults only'; end if;

  select * into a from actions where id = p_action for update;
  if a.id is null or a.status <> 'published' then raise exception 'not open'; end if;
  if a.starts_at <= now() then raise exception 'already started'; end if;

  select * into existing from rsvps where action_id = a.id and user_id = me.id and status <> 'cancelled';
  if existing.id is not null then return existing; end if;

  if a.visibility = 'invite' and a.host_id <> me.id and not is_member(a.circle_id) then
    select * into inv from invitations
      where action_id = a.id and token = p_invite and revoked_at is null and expires_at > now() and uses < max_uses
      for update;
    if inv.id is null then raise exception 'invitation expired'; end if;
    update invitations set uses = uses + 1 where id = inv.id;
  end if;

  select count(*) into confirmed from rsvps where action_id = a.id and status = 'confirmed';
  insert into rsvps (action_id, user_id, status, campaign_code, channel)
    values (a.id, me.id, case when confirmed < a.capacity then 'confirmed' else 'waitlisted' end::rsvp_status,
            p_code, case when p_code is null then null else coalesce(p_channel, 'unknown') end)
    returning * into r;

  if r.status = 'confirmed' and p_role is not null then
    select (select count(*) from rsvps where action_id = a.id and status = 'confirmed' and role_slot_id = p_role) < s.capacity
      into role_room from role_slots s where s.id = p_role and s.action_id = a.id;
    if role_room then update rsvps set role_slot_id = p_role where id = r.id returning * into r; end if;
  end if;

  if r.status = 'confirmed' and a.circle_id is not null then
    insert into memberships (circle_id, user_id) values (a.circle_id, me.id)
      on conflict (circle_id, user_id) do update set left_at = null;
  end if;
  if p_code is not null then
    insert into campaign_events (action_id, code, channel, kind, user_id) values (a.id, p_code, coalesce(p_channel, 'unknown'), 'join', me.id);
  end if;
  insert into audit_events (actor_id, action, target_type, target_id) values (me.id, 'rsvp.' || r.status, 'action', a.id::text);
  return r;
end $$;

create or replace function promote_waitlist(p_action uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a actions; nxt rsvps;
begin
  select * into a from actions where id = p_action for update;
  loop
    exit when (select count(*) from rsvps where action_id = a.id and status = 'confirmed') >= a.capacity;
    select * into nxt from rsvps where action_id = a.id and status = 'waitlisted' order by created_at limit 1 for update;
    exit when nxt.id is null;
    update rsvps set status = 'confirmed', promoted_at = now() where id = nxt.id;
    insert into memberships (circle_id, user_id) values (a.circle_id, nxt.user_id) on conflict (circle_id, user_id) do update set left_at = null;
    insert into notifications (user_id, text, href) values (nxt.user_id, 'A spot opened up — you''re in for “' || a.title || '”!', '/a/' || a.slug);
  end loop;
end $$;
revoke execute on function promote_waitlist(uuid) from public, anon, authenticated;

create or replace function leave_action(p_action uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from actions where id = p_action for update;
  update rsvps set status = 'cancelled', cancelled_at = now(), role_slot_id = null
    where action_id = p_action and user_id = auth.uid() and status <> 'cancelled';
  if not found then raise exception 'not on this plan'; end if;
  perform promote_waitlist(p_action);
end $$;

create or replace function choose_role(p_action uuid, p_role uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cap int; taken int;
begin
  perform 1 from actions where id = p_action for update;
  if not is_confirmed(p_action) then raise exception 'confirmed participants only'; end if;
  if p_role is not null then
    select capacity into cap from role_slots where id = p_role and action_id = p_action;
    if cap is null then raise exception 'no such role'; end if;
    select count(*) into taken from rsvps where action_id = p_action and status = 'confirmed' and role_slot_id = p_role and user_id <> auth.uid();
    if taken >= cap then raise exception 'role taken'; end if;
  end if;
  update rsvps set role_slot_id = p_role where action_id = p_action and user_id = auth.uid() and status = 'confirmed';
end $$;

-- Invite-only page reads with a token (no RLS bypass beyond this one row).
create or replace function get_action_by_invite(p_slug text, p_token text) returns setof actions
language sql stable security definer set search_path = public as $$
  select a.* from actions a join invitations i on i.action_id = a.id
  where a.slug = p_slug and i.token = p_token and i.revoked_at is null and i.expires_at > now() and i.uses < i.max_uses
    and a.status in ('published', 'completed', 'cancelled')
$$;

create or replace function create_invitation(p_action uuid, p_days int default 7, p_max int default 20) returns invitations
language plpgsql security definer set search_path = public as $$
declare inv invitations;
begin
  if not manages_action(p_action) then raise exception 'hosts only'; end if;
  insert into invitations (action_id, created_by, expires_at, max_uses)
    values (p_action, auth.uid(), now() + make_interval(days => least(greatest(p_days, 1), 30)), least(greatest(p_max, 1), 100))
    returning * into inv;
  return inv;
end $$;

create or replace function revoke_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update invitations set revoked_at = now() where id = p_invitation and manages_action(action_id);
end $$;

-- Publish: reviewed hosts (or members repeating an established Circle's format) go live;
-- everyone else goes to pilot review.
create or replace function publish_action(p_action uuid) returns action_status
language plpgsql security definer set search_path = public as $$
declare a actions; me profiles; established boolean; c uuid;
begin
  select * into me from profiles where id = auth.uid();
  select * into a from actions where id = p_action for update;
  if a.host_id <> me.id or a.status <> 'draft' then raise exception 'not allowed'; end if;
  if me.host_status = 'suspended' then raise exception 'hosting paused'; end if;
  if a.starts_at <= now() or a.area_label = '' or a.venue_name = ''
     or coalesce((select venue_address from action_private where action_id = a.id), '') = '' then
    raise exception 'incomplete';
  end if;
  established := a.circle_id is not null and is_member(a.circle_id)
    and exists (select 1 from actions x where x.circle_id = a.circle_id and x.id <> a.id and x.status in ('published', 'completed'));
  if me.host_status = 'approved' or established then
    if a.circle_id is null then
      insert into circles (name, created_by) values (a.title, me.id) returning id into c;
      insert into memberships (circle_id, user_id, role) values (c, me.id, 'host');
      update actions set circle_id = c where id = a.id;
    end if;
    update actions set status = 'published', published_at = now(), review_note = null where id = a.id;
    return 'published';
  end if;
  update actions set status = 'in_review' where id = a.id;
  update profiles set host_status = 'pending' where id = me.id and host_status = 'none';
  return 'in_review';
end $$;

create or replace function review_action(p_action uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare a actions; c uuid;
begin
  if not is_operator() then raise exception 'operators only'; end if;
  select * into a from actions where id = p_action and status = 'in_review' for update;
  if a.id is null then raise exception 'nothing to review'; end if;
  if p_approve then
    update profiles set host_status = 'approved' where id = a.host_id and host_status <> 'suspended';
    if a.circle_id is null then
      insert into circles (name, created_by) values (a.title, a.host_id) returning id into c;
      insert into memberships (circle_id, user_id, role) values (c, a.host_id, 'host');
      update actions set circle_id = c where id = a.id;
    end if;
    update actions set status = 'published', published_at = now(), review_note = null where id = a.id;
  else
    update actions set status = 'draft', review_note = coalesce(nullif(p_note, ''), 'Please check the details and resubmit.') where id = a.id;
  end if;
  insert into audit_events (actor_id, action, target_type, target_id, meta)
    values (auth.uid(), case when p_approve then 'action.review_approve' else 'action.review_return' end, 'action', a.id::text, jsonb_build_object('note', p_note));
end $$;

-- "Try this with your people": copies ONLY format fields. No venue, address, notes,
-- participants, roles held, invitations, conversation, stories or feedback.
create or replace function adapt_action(p_source uuid) returns actions
language plpgsql security definer set search_path = public as $$
declare s actions; d actions;
begin
  if not coalesce((select adult_confirmed from profiles where id = auth.uid()), false) then raise exception 'adults only'; end if;
  select * into s from actions where id = p_source;
  if s.id is null or not s.allow_adaptation or s.status not in ('published', 'completed') or s.visibility <> 'public' then
    raise exception 'not adaptable';
  end if;
  insert into actions (slug, host_id, status, title, summary, what_to_expect, category, starts_at, duration_mins, effort,
                       cost_label, accessibility, capacity, visibility, allow_adaptation, source_url, source_credit,
                       adapted_from_id, lineage_root_id, lessons, campaign_code)
  values (left(regexp_replace(lower(s.title), '[^a-z0-9]+', '-', 'g'), 40) || '-' || substr(md5(random()::text), 1, 4),
          auth.uid(), 'draft', s.title, s.summary, s.what_to_expect, s.category, now() + interval '14 days', s.duration_mins, s.effort,
          s.cost_label, s.accessibility, 8, 'public', true, s.source_url, s.source_credit,
          s.id, coalesce(s.lineage_root_id, s.id), s.lessons, upper(substr(md5(random()::text), 1, 6)))
  returning * into d;
  insert into action_private (action_id) values (d.id);
  insert into role_slots (action_id, name, emoji, description, capacity)
    select d.id, name, emoji, description, capacity from role_slots where action_id = s.id;
  insert into notifications (user_id, text, href) values (s.host_id, 'Someone is adapting “' || s.title || '” for their own group', '/a/' || s.slug);
  return d;
end $$;

-- Hosts get aggregates only, and only with at least five responses. Never notes.
create or replace function feedback_aggregate(p_action uuid)
returns table (responses int, avg_worth_it numeric, would_return_pct int, felt_welcome_pct int)
language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  if not (manages_action(p_action) or is_operator()) then raise exception 'hosts only'; end if;
  select count(*) into n from feedback where action_id = p_action;
  if n < 5 then return query select n, null::numeric, null::int, null::int; return; end if;
  return query select n, round(avg(worth_it), 1), (100 * count(*) filter (where would_return) / n)::int,
                      (100 * count(*) filter (where felt_welcome) / n)::int
               from feedback where action_id = p_action;
end $$;

-- Stories become public only when every confirmed participant (and the host) grants consent.
create or replace function request_public_story(p_story uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s stories;
begin
  select * into s from stories where id = p_story and author_id = auth.uid() for update;
  if s.id is null then raise exception 'not allowed'; end if;
  delete from story_consents where story_id = s.id;
  insert into story_consents (story_id, user_id, decision)
    select s.id, u, case when u = auth.uid() then 'granted' else 'pending' end::consent_state
    from (select user_id u from rsvps where action_id = s.action_id and status = 'confirmed'
          union select host_id from actions where id = s.action_id) people;
  update stories set visibility = 'awaiting_consent' where id = s.id;
  perform settle_story(s.id);
end $$;

create or replace function decide_story_consent(p_story uuid, p_granted boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update story_consents set decision = case when p_granted then 'granted' else 'declined' end::consent_state, decided_at = now()
    where story_id = p_story and user_id = auth.uid();
  if not found then raise exception 'consent not needed'; end if;
  perform settle_story(p_story);
end $$;

create or replace function settle_story(p_story uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from story_consents where story_id = p_story and decision = 'declined') then
    update stories set visibility = 'private' where id = p_story;
  elsif not exists (select 1 from story_consents where story_id = p_story and decision <> 'granted') then
    update stories set visibility = 'public', published_at = now() where id = p_story;
  end if;
end $$;
revoke execute on function settle_story(uuid) from public, anon, authenticated;

-- Visits only count when they carry the plan's real campaign code.
create or replace function record_campaign_event(p_action uuid, p_kind campaign_kind, p_channel channel, p_code text default null)
returns void language plpgsql security definer set search_path = public as $$
declare a actions;
begin
  select * into a from actions where id = p_action and status in ('published', 'completed');
  if a.id is null then return; end if;
  if p_kind = 'visit' and p_code is distinct from a.campaign_code then return; end if;
  if p_kind = 'join' then return; end if; -- joins are recorded by join_action()
  insert into campaign_events (action_id, code, channel, kind, user_id) values (a.id, a.campaign_code, p_channel, p_kind, auth.uid());
end $$;
