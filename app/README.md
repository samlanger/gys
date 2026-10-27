# Analog finder (prototype)

A single-page tool: describe a town, then see analog cases, ranked moves, niche-finder questions, provocations and an exportable board briefing.

## Run it

    python3 app/build.py           # regenerate app/data.js from taxonomy + cases
    python3 -m http.server -d app  # then open http://localhost:8000

Opening `app/index.html` directly in a browser also works.

## Where the data comes from

- **Intervention types** are parsed from `schema/taxonomy.md`.
- **Cases** come from `data/preview_cases.json` (unverified stubs, for the prototype only) and from researched case cards in `cases/*.json`. A researched card replaces a preview stub with the same id. To give a researched card asset tags for matching, add `meta.app_asset_tags`.
- **Fit rules** (asset → move, goal → move, constraint → move) are editorial heuristics in `index.html`. They are meant to be replaced by patterns learned from researched cases in Phase 7.

Profile and niche-finder notes are saved in the browser's localStorage only.
