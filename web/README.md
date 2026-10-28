# Huddle (working name)

**Bring an idea. Find your people. Make it happen.**

A mobile-first web app that turns online inspiration into small, real gatherings — and helps a good gathering become a recurring **Circle** and a format other groups can **adapt**.

> The product name is undecided. Change it with `NEXT_PUBLIC_APP_NAME`.

## Quick start (demo, no credentials)

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

The demo runs on a local file store (`.data/demo.json`) seeded with **sample data**. Every sample person, Circle, story and number is labelled “Sample” in the UI and excluded from pilot metrics by default. A yellow banner lets you switch between sample personas:

| Persona | Try this |
|---|---|
| **Alex** (new) | Join *Beginner repair afternoon*, pick a role, then “Try this with your people” and send it for review |
| **Maya** (host) | Manage the upcoming plan, open the share kit, wrap up a past gathering and repeat it |
| **Dev** (member-host) | Plan the next Circle gathering without fresh review |
| **Pilot operator** | Approve Alex’s plan, handle reports, see learning metrics |

Or sign in as yourself with any name and email (the demo doesn’t send email). “Reset demo data” is in the banner.

## The loop

| Flow | Where |
|---|---|
| **Join**: shared link → clear page → name + email → confirmed or waitlist → optional role → calendar | `/a/[slug]`, `/signin`, `/api/ics/[slug]` |
| **Host**: template / link / idea → practical details → public vs private preview → publish (or review) → share → manage | `/plan/new`, `/plan/[id]/edit`, `/plan/[id]/share`, `/plan/[id]/manage` |
| **Continue**: mark it happened → attendance → private feedback → story → thank someone → next date with lessons | `/plan/[id]/wrap`, `/c/[id]`, feedback on `/a/[slug]` |
| **Spread**: “Try this with your people” → format-only copy → new host/date/venue/size → pilot review | `/adapt/[slug]`, `/ops` |
| **Operate**: review queue, reports, appeals, deletions, founder-prompted flags, support log, metrics, audit | `/ops` |

## What makes it fun (without being manipulative)

Ticket-style invitations, hand-drawn illustrations, confetti and a “You’re in!” stamp when you join, an open-seat strip that fills up, emoji roles, a thank-you wall, and a **Circle garden** that grows a plant per gathering (flowers for roles taken, sparkles for thank-yous).

Deliberately absent: popularity scores, streaks, infinite feeds, recruiting rewards, FOMO notifications.

## Stack

- Next.js 15 (App Router, server actions), React 19, TypeScript, Tailwind CSS v4
- Domain rules in `src/lib/domain/*` (pure TypeScript, unit-tested)
- Demo store: `src/lib/store/` — serialised transactions over a JSON file
- Supabase/Postgres schema, RLS and rule-enforcing functions in `supabase/migrations/`

```
src/lib/domain/   types, access rules, join/capacity, actions, circles, adapt, share, ops
src/lib/views.ts  server-side serialisers — private fields leave the server only for authorised viewers
src/app/          pages, server actions (src/app/actions.ts), API routes (ics, share image, export)
supabase/         migrations: schema, row-level security, functions (join_action, adapt_action, …)
tests/            vitest domain tests
scripts/          e2e browser run, SQL migration check
```

## Checks

```bash
npm run typecheck
npm test              # domain rules (23 tests)
npm run test:sql      # applies migrations to in-memory Postgres (PGlite) and checks RLS + functions
npm run build
npm start & BASE_URL=http://localhost:3000 npm run e2e   # full loop in a mobile-size browser (needs Playwright)
```

What’s verified: private venue access, Circle privacy, invitation expiry + max uses, simultaneous joins never overfilling a plan or a role, waitlist promotion, rollback on failed writes, adaptation permissions, no private-data cloning, review before a new host goes live, share fallbacks, honest share status, feedback aggregate threshold, story consent, sample data excluded from metrics, and the full join → participate → repeat → adapt loop.

## Configuration

See `.env.example`. `SESSION_SECRET` signs the session cookie. `DATA_BACKEND=supabase` is reserved for the Postgres adapter (not wired yet — see `docs/LAUNCH_DEPENDENCIES.md`).

## Docs

- `docs/RUNBOOK.md` — running the pilot day to day
- `docs/LAUNCH_DEPENDENCIES.md` — what’s needed before real people use it

This repository contains an implementation only. Nothing here deploys, buys anything or sends external messages.
