# Operator runbook (pilot)

The operator console is `/ops` (operator accounts only). Everything you do there is written to the audit trail.

## Daily (10–15 minutes)

1. **Review queue** (`/ops#review`). For each plan from a new host or an adaptation, check:
   - The venue is a **public or partner space** (library, community hall, café), not a home.
   - Time, cost, effort and accessibility are clear and honest.
   - It’s for adults, and nothing looks like selling or recruitment.
   - For adaptations, the host has written their own place and details (the app never copies addresses, people or chats).
   Approve, or return it with a short, kind note. Approving also makes the person a reviewed host.
2. **Reports** (`/ops#reports`). Read every open report. You can remove a message, pause someone’s hosting (`/ops#accounts`) or cancel a plan by contacting the host. Resolve or dismiss with a note — the reporter is told it was looked at, not what was decided about another person.
3. **Appeals** (`/ops#appeals`). Uphold or deny with a short reason. A different operator than the one who made the decision should answer where possible.

## Weekly

- **Deletion requests** (`/ops#accounts`): complete within 30 days. Completing removes name, email, messages, private feedback and notifications, gives up any places, and makes related stories private.
- **Support log** (`/ops#support`): log every bit of hands-on help (minutes, Circle, what you did). This is how we tell founder effort from independent return.
- **Founder-prompted flags** (`/ops#actions`): mark any action you nudged into existence (“want to run another one on the 12th?”).
- **Metrics** (`/ops#metrics`): read with real data only (the default). Toggle sample data only for demos.

## Reading the numbers honestly

- **Mature Circle** = first gathering at least 28 days ago (or already has a second). Criterion 2 = share of mature Circles whose second gathering happened within 28 days of the first.
- Attendance is reported three ways and never merged: RSVPs, self-reported, host-confirmed. “Independently verified” is 0 until there’s a real method.
- Joins without a campaign code are “no attribution” — don’t guess.
- “Shares started” means someone opened a share sheet, saved an image or copied a caption. It is **not** a post.
- Track the bad news next to the good: departures, cancelled places, negative experiences, missing feedback, open reports, support minutes.
- These are learning criteria, not benchmarks. If the core loop isn’t working, fix it before adding features.

## Hosts: first-session checklist (to share with them)

- Confirm the venue booking and accessibility details in writing.
- Pre-thread needles / lay out materials before people arrive (or the equivalent for your format).
- Welcome everyone by name; explain the plan in two minutes.
- Leave 5 minutes at the end for show-and-tell and to pick the next date together.
- Afterwards: open the wrap-up page, mark who came, write the story, thank someone specific.

## Incidents

- Immediate danger: contact emergency services first, then the host and participants.
- Safety issue at a gathering: cancel or pause the plan (host page → cancel; everyone is told), pause hosting for the person involved, and document in the report.
- Data exposure: note what was exposed and to whom in the audit trail, tell affected people, and follow your data-protection obligations.

## Demo environment

- `npm run seed:reset` or “Reset demo data” in the banner restores sample data.
- Sample data is marked `isSample` and never counts in real metrics.
