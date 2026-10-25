# Heritage Valley Futures Studio — working conventions

Read SPEC.md for the product. This file is how we build it.

## Non-negotiables

- **Always store page numbers.** Every passage belongs to exactly one page of an original file kept in file storage. Never add a retrieval path that loses the page.
- **Never return uncited claims.** Claude answers only from retrieved passages. `src/lib/citations.ts` enforces this in code: each citation must point at a retrieved passage, each quote must appear verbatim in it, and each number in a claim must appear in a cited passage. Do not loosen these checks to make an answer pass; fix retrieval or the prompt instead.
- **Plain-language summary first.** Every output leads with at most three summary sentences; detail goes below.
- **"Not found in the sources"** is a correct answer. Prefer it to a guess.
- **Confidence labels** on every claim: directly stated, synthesized across sources (two or more citations), or the tool's suggestion (no numbers).
- **Policy register entries are preliminary, for review by county or city counsel.** Never phrase output as a legal conclusion.
- **Neutral.** Lay out trade-offs; no positions on candidates, parties, or ballot measures.
- **Audit trail.** Every answer is logged with the question, sources, prompt version, model, date, and who asked.

## Layout

- `src/lib/` — domain logic, no React. `ingest.ts` (PDF → pages → passages), `search.ts` (retrieval), `citations.ts` (validation), `ask.ts` (Q&A orchestrator), `policy.ts` (register), `claude.ts` (the only file that calls the Claude API).
- `prompts/<name>.v<N>.md` — prompts are versioned files. To change a prompt that has been used for logged answers, add a new version and point `src/lib/prompts.ts` at it.
- `db/schema.sql` — idempotent schema, applied on startup.
- `src/app/` — Next.js App Router pages and API routes. Route handlers stay thin and call `src/lib`.
- `tests/` — Vitest. Model calls are injected (`generate` option) so tests never hit the API.

## Commands

- `npm test` — unit and pipeline tests (in-memory Postgres via PGlite).
- `npm run typecheck`, `npm run build`.
- `npm run eval` — the cited-answer test set against the real model and library. Run it after any change to retrieval, prompts, or validation. Target: 95% or more.
- `npm run ingest -- <manifest.json>` — bulk-add documents.

## Build order

One room at a time: ingestion and the Ground Truth Room first (done in this slice), then the Dream Room, then the Pathway Room. Each phase starts only when the cited-answer test set passes.
