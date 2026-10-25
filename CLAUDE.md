# CLAUDE.md — Place Transformation Atlas

## Mission
Build the most useful research resource in the world for people who shape places: tourism boards, city/county leaders, developers, and cultural founders. Not another statistics dashboard. A **structured library of how places actually changed**: what they tried, why it worked or failed, who captured the value, and what happened 10–30 years later. The end product must help a board member think of *better and more original* ideas for their own place.

## Core research questions
1. What moves have places used to transform through tourism, culture, and identity, and under what conditions did each work?
2. What are the second-order effects (housing, displacement, overtourism, cultural loss, dependency), and when do they appear?
3. **Niche vs. hub:** Why do some places originate something distinctive and keep the value local, while others become hosts for outside IP, capital, or industries? What turns a host into an originator?
4. How do anchor projects and IP (Disney, Meow Wolf, Lord of the Rings, film/TV, festivals, museums, tech campuses) reshape the places around them?
5. Given a specific town's profile, which historical analogs are most relevant and what do they suggest?

## Working rules (non-negotiable)
- **Cite everything.** Every factual claim in a case card links to a source. No source → mark `unverified`.
- **Confidence scores** (high / medium / low) on every field that involves judgment.
- **Correlation ≠ causation.** Never say tourism "caused" an outcome without a comparison. Use the causal methods in Phase 5.
- **Include failures and cautionary tales** at roughly a 1:2 ratio with successes. Survivorship bias is the #1 flaw in existing tourism research.
- **Separate facts from interpretation** in separate fields.
- **Stop at the end of each phase** and summarize for human review before continuing.
- Keep a running `DECISIONS.md` log of schema changes and judgment calls.

## Phase 1 — Schema and taxonomy
Create `/schema/case_card.json` with at least these fields:
- `place`: name, country, admin level (town/county/region), coordinates, population over time
- `starting_conditions`: economy, decline drivers, geography, assets (natural, cultural, historical, human), access/transport
- `trigger`: what started the change (founder, institution, policy, disaster, media/IP, infrastructure, accident)
- `actors`: who led it; local vs. outside; public / private / civic / artist
- `interventions[]`: typed by the taxonomy below, with dates
- `timeline[]`: dated events
- `metrics`: before/after and time series (jobs, wages, business mix, home prices, rents, population, visitors, short-term rentals)
- `value_capture`: local ownership share, revenue leakage, local spinoff businesses, tax structure
- `identity`: how the place's story/brand changed; who authored it
- `second_order_effects[]`: positive and negative, with lag time
- `niche_vs_hub_assessment` (see module below)
- `lessons`, `open_questions`, `sources[]`, `confidence`

Create `/schema/taxonomy.md` of intervention types, including:
anchor institution (museum, university, campus) · branded IP / theme park · immersive art experience · film/TV location tourism · festival-to-identity · artist colonization · heritage/historic rebrand · food, wine & agritourism · nature/adventure/eco · wellness & transformational retreats · sports/mega-events · infrastructure (airport, rail, cable car) · special districts and tax regimes · visitor caps / high-value-low-volume · industrial cluster / innovation district · diaspora/pilgrimage · dark tourism · digital/media-driven virality

## Phase 2 — Seed list
Generate `/data/seed_list.csv` of 150 cases across eras (1850–present) and continents. The list must include these clusters:
- **IP and anchor projects:** Disney (Anaheim, Orlando/Reedy Creek, Paris, Tokyo, Hong Kong); Meow Wolf (Santa Fe origin + later cities); Lord of the Rings / Hobbiton (Matamata, NZ national branding); other film/TV location effects
- **Industry places that became identities:** Hollywood, Silicon Valley, Nashville, Napa, Detroit, Las Vegas
- **Cultural niche towns:** Marfa, Santa Fe, Ojai, Hudson NY, Asheville, Taos, Byron Bay, Ubud
- **Urban transformations:** Bilbao, Medellín, Barcelona, Kyoto, Lisbon, Singapore
- **Cautionary/overtourism:** Venice, Dubrovnik, Bali, Maya Bay, Amsterdam, Hallstatt
- **Policy models:** Bhutan, Iceland, Palau
- **Small agricultural/rural towns** that reinvented themselves, plus ones that tried and failed

Verify every inclusion and record a one-line reason. Do not trust memory for dates or facts; check sources.

## Phase 3 — Case research (pilot first)
- **Pilot:** fully research 15 diverse cases, then stop for review before doing the rest.
- Use one subagent per case. Each writes `/cases/<slug>.json` and `/cases/<slug>.md` (a readable narrative).
- Prefer primary and high-quality sources: government data, academic papers, historical newspapers (Chronicling America, national archives), official planning documents, reputable journalism, and the Wayback Machine for old tourism board sites.
- Record dissenting accounts when sources disagree.

## Phase 4 — Quantitative layer
Join time-series data to each case, starting with the US, then expanding:
- US: Census ACS and decennial census, BLS QCEW, BEA county GDP, County Business Patterns, Zillow/FHFA home prices, Inside Airbnb
- Global: Eurostat, OECD regional data, World Bank, UNWTO, national statistics offices, VIIRS nighttime lights as a universal proxy
- Store data in `/data/timeseries/` with a data dictionary. Note gaps honestly.

## Phase 5 — Causal analysis
For ~20 cases with good data, build comparison sets of similar places that did *not* transform. Run synthetic control or difference-in-differences analyses. Report effect sizes with uncertainty. Write results to `/analysis/causal/`.

## Phase 6 — Niche vs. Hub module
Produce `/analysis/niche_vs_hub.md` and a scoring rubric. For every case, assess:
- **Origin:** Was the core attraction born locally or imported?
- **Authorship:** Who owns the story, the IP, and the brand?
- **Value capture:** What share of revenue, jobs, and ownership stays local?
- **Compounding:** Did it spawn local spinoffs, talent, and new industries, or stay a single attraction?
- **Dependency:** How exposed is the place to one anchor, one company, or one IP?
- **Identity durability:** Is the place still distinctive without the anchor?
- **Transition path:** Did it move host → originator, originator → hub, or hub → hollowed out?

Classify cases into archetypes (proposed, to be revised against evidence): **Originator** · **Originator-turned-Hub** · **Host** · **Host-turned-Originator** · **Hollowed Hub** · **Deliberate Steward** (chose to limit growth). Identify the conditions and decisions that preceded each transition.

## Phase 7 — Pattern library
From all cases, write `/patterns/` with 50–100 entries in pattern-language format:
- Name · Problem it solves · Conditions where it worked · Mechanism · Typical timeline · Costs · Failure modes · Example cases (linked) · Compatible and conflicting patterns

## Phase 8 — Analog finder and idea tool
Build a simple local web app (`/app`):
1. **Profile input:** a user describes their town (population, assets, economy, region, constraints, ambitions).
2. **Analogs:** the 10 most similar cases, with what they did and how it went.
3. **Patterns:** relevant moves, ranked by fit, with risks.
4. **Niche finder:** questions and prompts that help a board surface what is *genuinely local and ownable* rather than copying others.
5. **Provocations:** unusual combinations of patterns, each stress-tested against historical failure modes.
6. **Export:** a briefing document for a board meeting.

## Phase 9 — Validation
- Draft an interview guide for tourism board members, planners, and founders.
- Have the analog finder run on 3 real towns; record what was useful and what was missing.
- Revise the schema and patterns based on feedback.

## Deliverables summary
`/schema` · `/data` · `/cases` · `/analysis` · `/patterns` · `/app` · `DECISIONS.md` · `README.md` (how to use and extend)

## Tooling
- Validate cards: `python3 schema/validate.py` (schema + taxonomy sync + id cross-references).

## Status
- Phase 1 (schema + taxonomy) drafted 2026-10-25 — **awaiting approval**.
