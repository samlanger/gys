# Heritage Valley Futures Studio — Product Spec

Oct 25, 2026 · Sam Langer

## Overview

Heritage Valley Futures Studio is a web tool that helps civic leaders in Fillmore, Piru, Santa Paula, and Ventura County move from a shared vision of the valley's future to concrete, sourced actions they can take now. It is built with Claude Code and powered by the Claude API.

**The problem.** Tourism and economic decisions in the valley are made from scattered PDFs, consultant reports, and memory. Leaders rarely share a written picture of the outcome they want. Rules that block progress are buried in general plans and municipal codes, and few people know which ones are changeable, by whom, or how hard.

**The product.** Three connected rooms:

1. **Dream Room** — evokes and records each stakeholder's vision, then shows where visions align and conflict.
2. **Ground Truth Room** — a cited library of local data, plans, laws, and reinvention case studies, with a policy audit of what is movable.
3. **Pathway Room** — works backward from the shared vision to a Now / Next / Later roadmap, each step tied to evidence and to the rules it touches.

**Primary customer.** The Heritage Valley tourism board director and the county supervisor's office (supervisor's aide/assistant). Secondary: city council members, chamber of commerce, business owners, farmers, and residents in facilitated sessions.

**One-line pitch.** "See the future you want, see what stands in the way, and see the next three moves — with a source for every claim."

## Users and design principles

Civic leaders are time-poor, publicly accountable, and politically exposed, so the tool must be fast to read, defensible in a public meeting, and neutral.

| User | What they need | What they fear |
|---|---|---|
| Tourism board director | Evidence for strategy, a shared vision, wins to show the board | Another report that sits on a shelf |
| Supervisor's aide | Briefings in minutes, what the county controls, constituent alignment | Being quoted on an AI claim that is wrong |
| City council member | What Fillmore can change locally and what it costs | Taking sides publicly before consensus |
| Business owner / farmer | How a decision affects their revenue and land | Being left out, or tourism crowding out agriculture |
| Resident | A voice in the vision | Traffic, rents, losing small-town character |

### Principles

- **Every claim cites a source.** No uncited numbers. Each answer links to the page of the document it came from.
- **Show the trade-offs, not a verdict.** The tool lays out options and consequences; elected leaders decide.
- **Plain language first.** Every output has a 3-sentence summary on top; detail below.
- **Many voices, visible.** Vision inputs are attributed by stakeholder type, so leaders see who wants what.
- **Meeting-ready.** Any view exports to a one-page brief or slide for a council or board agenda.
- **Agriculture and heritage are protected values, not obstacles.** Scenarios report impact on farmland and character alongside revenue.

## Core features

### 1. Dream Room — evoke the vision

- **Guided future interview.** Claude runs a 10–15 minute conversation: "It's 2040. A visitor spends a perfect day in the valley. Walk me through it." Follow-ups probe what residents feel, what the farms look like, what a business owner earns.
- **Vision card.** Output is a one-page future-state story plus 5–8 measurable targets (e.g. visitor spend, average stay in nights, local jobs, acres in agriculture, downtown vacancy rate).
- **Workshop mode.** A facilitator projects the room; participants answer on phones via a QR code. Themes cluster live on screen.
- **Alignment map.** Combines all vision cards to show shared themes, divergent ones, and open tensions (e.g. "more lodging" vs. "protect small-town feel").
- **Shared North Star.** Facilitator edits and publishes a consolidated vision the group approves; it becomes the target for the Pathway Room.

### 2. Ground Truth Room — see the facts and the rules

- **Ask the library.** Plain-language questions ("What did the last county tourism study say about overnight stays?") answered with page-level citations.
- **Valley dashboard.** Key indicators over time: population, jobs by sector, lodging rooms, sales and transient occupancy tax, visitor counts where available.
- **Case study explorer.** Town reinvention stories (Paso Robles, Solvang, Healdsburg, Ojai, Marfa, and cautionary cases), each tagged by move type, cost, timeline, and outcome.
- **Policy audit.** Every relevant rule is extracted into a register:

  | Field | Example |
  |---|---|
  | Rule | Zoning limit on overnight lodging in agricultural zones |
  | Source | Document, section, page link |
  | Who can change it | City council / Board of Supervisors / voters / state |
  | Change path | Administrative, ordinance amendment, General Plan amendment, ballot measure |
  | Difficulty | Low / Medium / High |
  | Blocks which visions | Linked to North Star targets |

- **Gap check.** Compares the North Star to current rules and data and lists the biggest gaps first.

### 3. Pathway Room — choose the next moves

- **Backcasting engine.** Starts at the North Star and works backward to today, producing a Now (0–12 months) / Next (1–3 years) / Later (3–10 years) roadmap.
- **Action cards.** Each action shows: owner, cost range, rules it touches, case-study evidence, expected effect on targets, and risks.
- **Scenario compare.** Side-by-side views of 2–3 strategies (e.g. agritourism-led, events-led, lodging-led) with impact on revenue, farmland, traffic, and housing pressure.
- **Brief generator.** Exports a one-page decision brief or slide for a board or council agenda, citations included.
- **Progress tracker.** Marks actions as started or done and updates the roadmap quarterly.

## MVP scope and pilot

The MVP proves the full dream → audit → pathway loop on one real decision the tourism board or supervisor's office faces now, using 30–50 core documents.

**In the MVP**

- Dream Room: guided interview, vision cards, alignment map (no live workshop mode yet)
- Ground Truth Room: cited Q&A over the document library, policy register for the pilot topic, 6–10 case studies
- Pathway Room: Now / Next / Later roadmap with action cards and one-page brief export
- Simple login for the pilot team (5–15 people)

**Not in the MVP:** live data feeds, public resident access, scenario modeling with numeric forecasts, progress tracking, mobile app.

**Candidate pilot decisions** (pick one with the board):

- Agritourism permitting: farm stays, farm dinners, u-pick on valley farms
- Lodging capacity: overnight stays in Fillmore and Piru
- A Heritage Valley visitor corridor linking Santa Paula, Fillmore, and Piru
- Signature annual event strategy

**Pilot format.** One stakeholder workshop (15–25 people) to gather visions, two weeks of library and audit work, then a review session where the board sees the roadmap and brief.

## Data sources and knowledge base

The library starts with public documents plus whatever studies the board and county already hold; each item is tagged by type, geography, date, and topic. Exact links and current editions are confirmed during build.

| Category | Starting sources | Used for |
|---|---|---|
| Plans and law | Ventura County General Plan, Fillmore general plan and municipal/zoning code, Santa Paula code, SOAR ordinance, county agritourism and short-term-rental rules | Policy audit |
| Tourism economics | Visit California economic impact reports by county, Ventura County tourism studies, transient occupancy tax reports | Dashboard, gap check |
| Economy and people | U.S. Census ACS, California EDD labor data, CDTFA taxable sales | Dashboard |
| Agriculture | Ventura County Agricultural Commissioner crop reports | Farmland impact |
| Local studies | Board strategic plans, chamber reports, past consultant studies, meeting minutes | Context, history |
| Case studies | Published accounts of Paso Robles, Solvang, Healdsburg, Ojai, Marfa, and others; tourism and placemaking books | Case study explorer |
| Stakeholder input | Vision interviews and workshop responses | Dream Room |

### Ingestion rules

- Store the original file and page numbers so every citation opens the exact page.
- Each document has an owner, date, and "last verified" field; anything older than 5 years is flagged as dated.
- Copyrighted books are summarized and cited, not stored in full for public display.

## Technical architecture

A standard web stack keeps it cheap to host and easy for a future county IT team to maintain; Claude Code builds and iterates on it.

The cited library is the source of truth: Claude only answers from passages retrieved from it, and the orchestrator rejects any answer without citations.

### Suggested stack

- Frontend: Next.js + Tailwind, mobile-friendly for workshop phones
- Backend: Next.js API routes or a small Python (FastAPI) service
- Database: Postgres with pgvector for search; Supabase is a quick hosted option
- Documents: PDF parsing that keeps page numbers (e.g. PyMuPDF), files in object storage
- AI: Claude API with prompts per room, stored in the repo as versioned files
- Auth: email magic-link login, roles for admin, facilitator, and viewer
- Exports: one-page brief to PDF and slide

### Working with Claude Code

- Put this spec in the repo as SPEC.md and a CLAUDE.md with conventions: always store page numbers, never return uncited claims, plain-language summaries first.
- Build one room at a time, starting with ingestion and the Ground Truth Room, since the other two depend on the library.
- Keep a small test set of 20 real questions with known answers and sources; run it after every change to catch wrong or uncited answers.

## Trust, governance, and legal guardrails

Public officials can only act on what they can defend, so trust features ship in the MVP, not later.

- **No citation, no claim.** The model answers only from the library; if it can't find support it says "not found in the sources" instead of guessing.
- **Confidence labels.** Each answer is marked as directly stated in a source, synthesized across sources, or the tool's suggestion.
- **Legal audit = flags for counsel.** Policy register entries are labeled "preliminary, for review by county or city counsel." The tool never states a legal conclusion.
- **Political neutrality.** No candidate, party, or ballot-measure positions. Scenarios present trade-offs evenly.
- **Public records awareness.** Assume anything entered may be subject to the California Public Records Act; workshop input is anonymous by default and attributed only by stakeholder type.
- **Brown Act awareness.** If a quorum of a board uses shared features together, that may count as a meeting; usage guidance is reviewed with counsel before launch.
- **Audit trail.** Every brief records its sources, the question asked, the date, and who generated it.
- **Human sign-off.** Nothing is published to the public until a named staff member approves it.

## Build plan, success metrics, open questions

The first step is not code: agree on the pilot decision with the tourism board director and the supervisor's aide, then build toward a working pilot in about 12 weeks.

Each phase starts only when the gate before it is met; the cited-answer test is the main quality bar.

### Success metrics for the pilot

| Metric | Target |
|---|---|
| Answers with correct citations on the test set | 95% or more |
| Stakeholders who complete a vision interview | 15 or more |
| Time for an aide to produce a decision brief | Under 30 minutes |
| Board members who rate the brief "usable as is" | Majority |
| Actions from the roadmap adopted or scheduled | At least 1 within 90 days |

### Open questions

- [ ] Which decision is the pilot about?
- [ ] Who owns the tool after the pilot: tourism board, county, or a nonprofit partner?
- [ ] Which internal studies and data can the board and county share?
- [ ] Does county IT require specific hosting, security, or accessibility standards?
- [ ] Which counsel reviews the policy register, and how often?
- [ ] Budget and pricing model: pilot fee, annual license, or grant-funded?
