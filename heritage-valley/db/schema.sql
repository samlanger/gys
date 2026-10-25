-- Heritage Valley Futures Studio schema. Idempotent: safe to run on every start.

-- Library documents. One row per original file.
CREATE TABLE IF NOT EXISTS documents (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL,          -- plans_law | tourism_economics | economy_people | agriculture | local_studies | case_studies
  doc_type        TEXT NOT NULL DEFAULT 'report', -- plan | code | ordinance | report | study | minutes | book | dataset
  geography       TEXT[] NOT NULL DEFAULT '{}',   -- e.g. {Fillmore, Piru, Santa Paula, Ventura County}
  topics          TEXT[] NOT NULL DEFAULT '{}',
  published_date  DATE,
  owner           TEXT NOT NULL,          -- who supplied / is responsible for this document
  last_verified   DATE NOT NULL DEFAULT CURRENT_DATE,
  source_url      TEXT,
  file_path       TEXT NOT NULL,          -- path inside file storage
  file_sha256     TEXT NOT NULL UNIQUE,
  page_count      INTEGER NOT NULL,
  pages_without_text INTEGER NOT NULL DEFAULT 0, -- scanned pages that need OCR
  copyrighted     BOOLEAN NOT NULL DEFAULT FALSE, -- summarized and cited, never displayed in full
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Retrievable passages. Every passage keeps the page it came from.
CREATE TABLE IF NOT EXISTS passages (
  id           SERIAL PRIMARY KEY,
  document_id  INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number  INTEGER NOT NULL CHECK (page_number >= 1),
  chunk_index  INTEGER NOT NULL,
  text         TEXT NOT NULL,
  tsv          TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  UNIQUE (document_id, page_number, chunk_index)
);
CREATE INDEX IF NOT EXISTS passages_tsv_idx ON passages USING GIN (tsv);
CREATE INDEX IF NOT EXISTS passages_document_idx ON passages (document_id);

-- Audit trail for every library answer: question, sources, date, who asked.
CREATE TABLE IF NOT EXISTS ask_log (
  id              SERIAL PRIMARY KEY,
  question        TEXT NOT NULL,
  answer          JSONB NOT NULL,
  passage_ids     INTEGER[] NOT NULL DEFAULT '{}',
  prompt_version  TEXT NOT NULL,
  model           TEXT,
  asked_by        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policy register. Entries are preliminary until reviewed by counsel.
CREATE TABLE IF NOT EXISTS policy_rules (
  id               SERIAL PRIMARY KEY,
  topic            TEXT NOT NULL,
  rule             TEXT NOT NULL,
  document_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  passage_id       INTEGER REFERENCES passages(id) ON DELETE SET NULL,
  section          TEXT,
  page_number      INTEGER NOT NULL,
  quote            TEXT NOT NULL,
  who_can_change   TEXT NOT NULL,  -- city_council | board_of_supervisors | voters | state | agency_staff | unclear
  change_path      TEXT NOT NULL,  -- administrative | ordinance_amendment | general_plan_amendment | ballot_measure | state_legislation | unclear
  difficulty       TEXT NOT NULL,  -- low | medium | high
  difficulty_rationale TEXT NOT NULL,
  blocks_visions   TEXT,           -- linked to North Star targets once the Dream Room ships
  review_status    TEXT NOT NULL DEFAULT 'preliminary', -- preliminary | reviewed_by_counsel
  reviewed_by      TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single-use magic-link tokens (only the hash is stored).
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash  TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ
);
