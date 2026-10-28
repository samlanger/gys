-- Row-level security. Default deny; every table has RLS on.
-- Writes that enforce rules (capacity, adaptation, consent) go through the
-- security-definer functions in the next migration, not direct inserts.

create or replace function is_operator() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_operator from profiles where id = auth.uid()), false)
$$;

create or replace function is_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where circle_id = c and user_id = auth.uid() and left_at is null)
$$;

create or replace function is_confirmed(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rsvps where action_id = a and user_id = auth.uid() and status = 'confirmed')
$$;

create or replace function has_live_rsvp(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rsvps where action_id = a and user_id = auth.uid() and status <> 'cancelled')
$$;

create or replace function manages_action(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from actions x
    where x.id = a and (
      x.host_id = auth.uid()
      or (x.status <> 'draft' and exists (
        select 1 from memberships m where m.circle_id = x.circle_id and m.user_id = auth.uid() and m.role = 'host' and m.left_at is null))
    )
  )
$$;

alter table profiles enable row level security;
alter table circles enable row level security;
alter table memberships enable row level security;
alter table templates enable row level security;
alter table actions enable row level security;
alter table action_private enable row level security;
alter table role_slots enable row level security;
alter table rsvps enable row level security;
alter table invitations enable row level security;
alter table stories enable row level security;
alter table story_consents enable row level security;
alter table feedback enable row level security;
alter table appreciations enable row level security;
alter table messages enable row level security;
alter table campaign_events enable row level security;
alter table reports enable row level security;
alter table appeals enable row level security;
alter table notifications enable row level security;
alter table support_logs enable row level security;
alter table audit_events enable row level security;

-- Profiles: you see yourself. First names of hosts and co-members are exposed via public_profiles.
create policy "own profile" on profiles for select using (id = auth.uid() or is_operator());
create policy "update own profile" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and is_operator = (select is_operator from profiles where id = auth.uid())
              and host_status = (select host_status from profiles where id = auth.uid()));
create view public_profiles with (security_invoker = false) as
  select p.id, p.name, p.bio from profiles p
  where p.deletion_requested_at is null and (
    p.id = auth.uid()
    or exists (select 1 from actions a where a.host_id = p.id and a.status in ('published', 'completed'))
    or exists (select 1 from memberships m where m.user_id = p.id and m.left_at is null and is_member(m.circle_id))
  );

-- Templates are public.
create policy "templates readable" on templates for select using (true);
create policy "templates by operators" on templates for all using (is_operator()) with check (is_operator());

-- Actions: published public ones are readable by anyone. Invite-only needs membership/RSVP
-- (invite-token reads go through get_action_by_invite()). Drafts: host + operators.
create policy "read actions" on actions for select using (
  (status in ('published', 'completed', 'cancelled') and (visibility = 'public' or is_member(circle_id) or has_live_rsvp(id)))
  or host_id = auth.uid()
  or manages_action(id)
  or is_operator()
);
create policy "hosts create drafts" on actions for insert with check (host_id = auth.uid() and status = 'draft');
create policy "hosts edit" on actions for update using (manages_action(id) and status in ('draft', 'published'))
  -- Hosts can't self-publish or self-approve: status changes go through publish_action()/review_action().
  with check (manages_action(id) and status = (select status from actions a where a.id = actions.id));

-- Private logistics: confirmed participants, managers, operators. Never waitlist or public.
create policy "private details" on action_private for select using (is_confirmed(action_id) or manages_action(action_id) or is_operator());
create policy "hosts write private" on action_private for all using (manages_action(action_id)) with check (manages_action(action_id));

create policy "read roles" on role_slots for select using (exists (select 1 from actions a where a.id = action_id));
create policy "hosts manage roles" on role_slots for all using (manages_action(action_id)) with check (manages_action(action_id));

-- RSVPs: your own, plus everyone's if you're confirmed/member/manager (for "who's coming").
create policy "read rsvps" on rsvps for select using (
  user_id = auth.uid() or manages_action(action_id) or is_confirmed(action_id) or is_operator()
);
-- No direct insert/update: use join_action(), leave_action(), choose_role().

create policy "hosts read invitations" on invitations for select using (manages_action(action_id) or is_operator());
-- Create/revoke via create_invitation()/revoke_invitation().

-- Circles & conversation: members only.
create policy "members read circle" on circles for select using (is_member(id) or is_operator());
create policy "members read memberships" on memberships for select using (is_member(circle_id) or user_id = auth.uid() or is_operator());
create policy "leave circle" on memberships for update using (user_id = auth.uid()) with check (user_id = auth.uid() and role = (select role from memberships m where m.circle_id = memberships.circle_id and m.user_id = auth.uid()));
create policy "members read messages" on messages for select using (is_member(circle_id));
create policy "members post" on messages for insert with check (user_id = auth.uid() and is_member(circle_id));

-- Stories: members see their Circle's; anyone sees public ones.
create policy "read stories" on stories for select using (visibility = 'public' or is_member(circle_id) or is_operator());
create policy "members write stories" on stories for insert with check (author_id = auth.uid() and is_member(circle_id) and visibility = 'private');
create policy "read consents" on story_consents for select using (user_id = auth.uid() or exists (select 1 from stories s where s.id = story_id and s.author_id = auth.uid()));

-- Feedback is private to its author. Hosts only get feedback_aggregate().
create policy "own feedback" on feedback for select using (user_id = auth.uid());
create policy "give feedback" on feedback for insert with check (user_id = auth.uid() and is_confirmed(action_id));
create policy "update feedback" on feedback for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "circle appreciations" on appreciations for select using (is_member(circle_id));
create policy "thank members" on appreciations for insert with check (from_id = auth.uid() and is_member(circle_id));

-- Measurement: hosts see their own action's events; inserts via record_campaign_event().
create policy "host campaign events" on campaign_events for select using (manages_action(action_id) or is_operator());

create policy "file reports" on reports for insert with check (reporter_id = auth.uid());
create policy "own reports" on reports for select using (reporter_id = auth.uid() or is_operator());
create policy "operators resolve" on reports for update using (is_operator()) with check (is_operator());

create policy "file appeals" on appeals for insert with check (user_id = auth.uid());
create policy "own appeals" on appeals for select using (user_id = auth.uid() or is_operator());
create policy "operators answer" on appeals for update using (is_operator()) with check (is_operator());

create policy "own notifications" on notifications for select using (user_id = auth.uid());
create policy "read notifications" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "operators support" on support_logs for all using (is_operator()) with check (is_operator());
create policy "operators audit" on audit_events for select using (is_operator());
