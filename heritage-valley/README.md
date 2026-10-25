# Heritage Valley Futures Studio

A web tool that helps civic leaders in Fillmore, Piru, Santa Paula, and Ventura County move from a shared vision of the valley's future to concrete, sourced actions. See [SPEC.md](SPEC.md) for the product and [CLAUDE.md](CLAUDE.md) for build conventions.

## What's built

This first slice follows the spec's build order: **ingestion and the Ground Truth Room**, plus the trust features the MVP requires.

| Area | Status |
|---|---|
| Document ingestion (PDF, page numbers kept, owner / date / last-verified, dated flag, duplicate detection, OCR warnings, copyrighted works cited but never displayed) | Done |
| Ask the library: retrieval, Claude answer, code-enforced citation checks, one repair round, confidence labels, "not found in the sources" | Done |
| One-page brief (print or save as PDF) with audit trail | Done |
| Policy register: Claude extraction with verified quotes, who / how / difficulty, "preliminary, for counsel" label, recorded counsel sign-off | Done |
| Case study explorer: seed list from the spec, linked to library sources | Done (needs sources) |
| Magic-link login for the pilot allowlist, roles (admin / facilitator / viewer) | Done (link is logged, not emailed yet) |
| Cited-answer test-set runner (`npm run eval`) | Done (needs the 20 real questions) |
| Valley dashboard, gap check | Not started |
| Dream Room, Pathway Room | Next phases (placeholder pages) |

## How an answer is checked

1. The question is matched against library passages with Postgres full-text search. Each passage belongs to one page of one document.
2. Claude gets the top passages and returns structured claims, each with passage ids and verbatim quotes.
3. `src/lib/citations.ts` checks every claim: the cited passage was retrieved, the quote appears in it, every number in the claim appears in a cited passage, synthesized claims cite at least two passages, and suggestions contain no numbers.
4. If anything fails, Claude gets one chance to fix it. Anything still failing is dropped and listed as "removed".
5. If no sourced claim survives, the answer is "Not found in the sources."
6. The answer, its sources, the prompt version, the model, and who asked are written to `ask_log`.

## Run it locally

Requires Node 20+.

```bash
cd heritage-valley
npm install
cp .env.example .env.local     # set ANTHROPIC_API_KEY and PILOT_USERS
npm run dev
```

Without `DATABASE_URL`, an embedded Postgres (PGlite) is stored under `storage/pgdata`. Original files go to `storage/files`. Both are gitignored.

**Signing in.** Enter an allowlisted email on `/login`. Until an email provider is connected, the sign-in link is printed in the server log. For local work only, `AUTH_DISABLED=true` skips login (ignored in production).

**Adding documents.** Use the upload form on Ground Truth → Library (admins and facilitators), or bulk-load from a manifest:

```bash
npm run ingest -- data/manifest.json   # see data/manifest.example.json
```

## Quality checks

```bash
npm test            # unit + pipeline tests, no API calls
npm run typecheck
npm run build
npm run eval        # real model, real library: eval/questions.json
```

To set up the test set, copy `eval/questions.example.json` to `eval/questions.json` and replace the examples with 20 real questions. Each question lists the document title and pages the answer must cite and any key phrases it must contain. Include a few questions the library can't answer: for those, the right result is "not found". The run fails below 95%.

## Deploying

- **Database:** any Postgres 15+ (Supabase works). Set `DATABASE_URL`; the schema applies itself on startup.
- **Files:** `FILE_STORAGE_DIR` must be persistent storage. Moving to object storage only means changing the read/write calls in `src/lib/ingest.ts` and `src/app/api/files/[id]/route.ts`.
- **Secrets:** `ANTHROPIC_API_KEY`, `SESSION_SECRET` (32+ characters, required in production), `PILOT_USERS`, `APP_URL`.

## Notes and next steps

- **Retrieval** is Postgres full-text search, which finds exact section numbers and defined terms in codes. Adding pgvector semantic search alongside it is the next retrieval step, if the eval shows questions being missed.
- **Model:** `claude-opus-5-5` with structured outputs and server-side refusal fallback (`fallbacks: "default"`). Override with `CLAUDE_MODEL`.
- **Scanned PDFs** with no text layer are flagged on upload. Run OCR first, e.g. `ocrmypdf`.
- **Email delivery** of sign-in links: wire `deliverLoginLink` in `src/lib/auth.ts` to the county's mail service once IT confirms one.
- **Case studies** have no findings until sources are added to the library. Cost, timeline, and outcome will come from those sources.
