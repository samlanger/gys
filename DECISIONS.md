# Decisions Log

Schema changes and judgment calls, newest last. Each entry: date · phase · decision · why · status.

## 2026-10-25 · Phase 1 · Repository layout
- **Decision:** Build the atlas in new top-level folders (`/schema`, `/data`, `/cases`, …) alongside the legacy "Get You Started" static site files (`index.html`, `css/`, `js/`, `foundation/`, `content`, `README*`), which are left untouched.
- **Why:** These files aren't related to the atlas, but deleting someone's files without being asked is not my call.
- **Status:** Open. Should the legacy site move to `/legacy` or be deleted?

## 2026-10-25 · Phase 1 · Facts vs. interpretation enforced by type
- **Decision:** Two building blocks. A `fact` holds a value, source ids and a verification status (verified / unverified / disputed / derived). An `assessment` holds a judgment, a confidence and a rationale. No field accepts both.
- **Why:** The brief says to keep facts and interpretation in separate fields. Making that a type rule means a validator can enforce it, rather than relying on reviewers to notice.
- **Rule:** If a `fact` has no sources, its status must be `unverified`. If it is `disputed`, it must list the competing accounts. Both rules are checked by the schema.

## 2026-10-25 · Phase 1 · Causal claims get their own type
- **Decision:** Every before/after contrast and every second-order effect carries a `causal_claim` with an `evidence_type`. The types run from strong to weak: causal_estimate, quasi_experimental, correlational, descriptive_trend, qualitative, anecdotal, none.
- **Why:** The rule "correlation ≠ causation" only bites if the card records how strong the evidence is. Downstream (patterns, the app), only the first two types may be described with words like "caused".

## 2026-10-25 · Phase 1 · Sources registered once, referenced by id
- **Decision:** Each card has a `sources[]` registry (S1, S2, …). Each entry has a quality `tier` (A–E) and a `perspective` (promoter, critic, …). Every other field cites source ids.
- **Why:** Avoids repeating citations, lets us weight evidence, and flags tourism-board and developer claims (tier D) so they aren't used as evidence of outcomes.

## 2026-10-25 · Phase 1 · Explicit statistical geographies
- **Decision:** Each card lists its `geo_units` (town, county, NUTS3, …) and how each one relates to the place. Every number points to one of them.
- **Why:** Most small-place research quietly mixes town and county figures. Marfa is a small part of Presidio County, and Matamata is part of a larger district. Making the geography explicit stops this.

## 2026-10-25 · Phase 1 · Outcome classification is required
- **Decision:** Each case has a required `outcome.classification.label`: success / mixed / cautionary / failure / too_early. It also records whose measure of success is being used.
- **Why:** Lets us track the 1:2 failure-to-success target, and stops the analog finder from returning only winners. "Success by whose measure" is there because a place can succeed for investors while failing its renters.

## 2026-10-25 · Phase 1 · Niche-vs-hub scores on a common 0–4 scale
- **Decision:** All six dimensions are scored so that 4 means the more originator / locally-held / resilient end. That means `dependency` is scored inversely. A null score means there isn't enough evidence. Archetype is a *history* (a list of periods), not a single label.
- **Why:** A shared scale allows a profile chart and clustering. Places move between archetypes over time, so one label would hide the transitions the brief cares about.
- **Status:** Draft. The rubric's anchor descriptions are finalized in Phase 6. `rubric_version` is set to "draft-0" until then.

## 2026-10-25 · Phase 1 · Taxonomy expanded from 18 to 27 types
- **Decision:** Added designation_listing, place_branding_campaign, waterfront_brownfield_regeneration, gaming_casino, amenity_migration_remote_work, housing_str_regulation, community_ownership_model, indigenous_led_tourism and cruise_port. The rationale for each is in `schema/taxonomy.md`.
- **Decision:** Lead actor, locality, scale and cost are *facets*, not types. The trigger has its own vocabulary, separate from intervention types.
- **Why:** Keeps the type list short and lets the analog finder combine facets freely.

## 2026-10-25 · Phase 1 · In-migrant residents are a distinct locality
- **Decision:** `actors[].locality` separates `in_migrant_resident` (an outsider who moved in and stayed, e.g. an artist founder) from both `local_born` and absentee outside actors.
- **Why:** Whether Judd's Marfa or a relocated founder's town counts as "originated locally" is a core niche-vs-hub question. A yes/no local field would decide it in advance.

## 2026-10-25 · Phase 1 · Taxonomy examples are unverified
- **Decision:** The illustrative cases in `taxonomy.md` are labeled as candidates. They are not sourced claims.
- **Why:** The rule is "Do not trust memory." They'll be verified, or dropped, during Phase 2.
