-- Core records. Mirrors src/lib/domain/types.ts.
create extension if not exists pgcrypto;

create type host_status as enum ('none', 'pending', 'approved', 'suspended');
create type action_status as enum ('draft', 'in_review', 'published', 'cancelled', 'completed');
create type effort_level as enum ('easy', 'some', 'stretch');
create type rsvp_status as enum ('confirmed', 'waitlisted', 'cancelled');
create type attendance as enum ('unknown', 'self_reported', 'host_confirmed', 'absent');
create type story_visibility as enum ('private', 'awaiting_consent', 'public');
create type consent_state as enum ('pending', 'granted', 'declined');
create type channel as enum ('x', 'instagram', 'tiktok', 'link', 'unknown');
create type campaign_kind as enum ('visit', 'join', 'share_opened', 'image_downloaded', 'caption_copied', 'link_copied');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  adult_confirmed boolean not null default false,
  host_status host_status not null default 'none',
  is_operator boolean not null default false,
  notify_email boolean not null default true,
  notify_reminders boolean not null default true,
  notify_circle_messages boolean not null default true,
  bio text check (char_length(bio) <= 280),
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now()
);

create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 80),
  emoji text not null default '🧵',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table memberships (
  circle_id uuid not null references circles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (circle_id, user_id)
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  emoji text not null,
  title text not null,
  summary text not null default '',
  what_to_expect text not null default '',
  category text not null default 'making',
  duration_mins int not null default 120,
  effort effort_level not null default 'easy',
  cost_label text not null default 'Free',
  accessibility text not null default '',
  roles jsonb not null default '[]',
  lessons text[] not null default '{}',
  attribution text not null default '',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- Public (format + public logistics) columns live in actions.
-- Private logistics live in action_private so RLS can protect them separately.
create table actions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  circle_id uuid references circles (id),
  host_id uuid not null references profiles (id),
  status action_status not null default 'draft',
  title text not null check (char_length(title) <= 80),
  summary text not null default '' check (char_length(summary) <= 240),
  what_to_expect text not null default '' check (char_length(what_to_expect) <= 1200),
  category text not null default 'making',
  starts_at timestamptz not null,
  duration_mins int not null check (duration_mins between 15 and 720),
  effort effort_level not null default 'easy',
  cost_label text not null default 'Free',
  accessibility text not null default '',
  area_label text not null default '',
  venue_name text not null default '',
  capacity int not null check (capacity between 2 and 60),
  visibility text not null default 'public' check (visibility in ('public', 'invite')),
  allow_adaptation boolean not null default false,
  source_url text check (source_url ~* '^https?://'),
  source_credit text,
  adapted_from_id uuid references actions (id),
  lineage_root_id uuid references actions (id),
  lessons text[] not null default '{}',
  campaign_code text not null unique,
  review_note text,
  founder_prompted boolean not null default false,
  cancel_reason text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);
create index on actions (circle_id);
create index on actions (lineage_root_id);

create table action_private (
  action_id uuid primary key references actions (id) on delete cascade,
  venue_address text not null default '',
  venue_notes text not null default ''
);

create table role_slots (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions (id) on delete cascade,
  name text not null check (char_length(name) <= 40),
  emoji text not null default '✨',
  description text not null default '',
  capacity int not null default 1 check (capacity between 1 and 10)
);

create table rsvps (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status rsvp_status not null,
  role_slot_id uuid references role_slots (id) on delete set null,
  attendance attendance not null default 'unknown',
  campaign_code text,
  channel channel,
  created_at timestamptz not null default clock_timestamp(),
  promoted_at timestamptz,
  cancelled_at timestamptz
);
-- One live RSVP per person per action.
create unique index rsvps_one_live on rsvps (action_id, user_id) where status <> 'cancelled';
create index on rsvps (action_id, status, created_at);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_uses int not null default 20 check (max_uses between 1 and 100),
  uses int not null default 0,
  revoked_at timestamptz
);

create table stories (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  action_id uuid not null references actions (id) on delete cascade,
  author_id uuid not null references profiles (id),
  what_happened text not null check (char_length(what_happened) <= 2000),
  learned text not null default '',
  next text not null default '',
  visibility story_visibility not null default 'private',
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table story_consents (
  story_id uuid not null references stories (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  decision consent_state not null default 'pending',
  decided_at timestamptz,
  primary key (story_id, user_id)
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  worth_it smallint not null check (worth_it between 1 and 5),
  would_return boolean not null,
  felt_welcome boolean not null,
  private_note text not null default '' check (char_length(private_note) <= 1000),
  created_at timestamptz not null default now(),
  unique (action_id, user_id)
);

create table appreciations (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions (id) on delete cascade,
  circle_id uuid not null references circles (id) on delete cascade,
  from_id uuid not null references profiles (id),
  to_id uuid not null references profiles (id),
  message text not null check (char_length(message) between 3 and 200),
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  user_id uuid not null references profiles (id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index on messages (circle_id, created_at);

create table campaign_events (
  id bigint generated always as identity primary key,
  action_id uuid not null references actions (id) on delete cascade,
  code text not null,
  channel channel not null default 'unknown',
  kind campaign_kind not null,
  user_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id),
  target_type text not null check (target_type in ('action', 'user', 'message', 'story', 'circle')),
  target_id uuid not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  subject text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'upheld', 'denied')),
  response text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  text text not null,
  href text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table support_logs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references profiles (id),
  minutes int not null check (minutes between 1 and 600),
  note text not null default '',
  circle_id uuid references circles (id),
  created_at timestamptz not null default now()
);

create table audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_type text not null,
  target_id text not null,
  meta jsonb,
  at timestamptz not null default now()
);
