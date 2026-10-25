/**
 * Bulk-ingest PDFs from a manifest.
 *
 *   npm run ingest -- data/manifest.json
 *
 * Paths in the manifest are relative to the manifest file. See
 * data/manifest.example.json for the fields.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "../src/lib/db";
import { ingestPdf, type DocumentMeta } from "../src/lib/ingest";

interface ManifestEntry extends DocumentMeta {
  file: string;
}

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error("Usage: npm run ingest -- <manifest.json>");
    process.exit(1);
  }
  const entries = JSON.parse(await fs.readFile(manifestPath, "utf8")) as ManifestEntry[];
  const db = await getDb();
  let failed = 0;
  for (const { file, ...meta } of entries) {
    const filePath = path.resolve(path.dirname(manifestPath), file);
    try {
      const r = await ingestPdf(db, await fs.readFile(filePath), meta, "ingest-cli");
      const note = r.duplicate
        ? "already in library"
        : `${r.pageCount} pages, ${r.passageCount} passages` +
          (r.pagesWithoutText.length ? `; no text on pages ${r.pagesWithoutText.join(", ")} (needs OCR)` : "");
      console.log(`✓ [${r.documentId}] ${meta.title}: ${note}`);
    } catch (err) {
      failed++;
      console.error(`✗ ${meta.title} (${file}): ${err instanceof Error ? err.message : err}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
