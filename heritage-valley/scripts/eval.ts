/**
 * Cited-answer test set (SPEC: "Keep a small test set of 20 real questions
 * with known answers and sources; run it after every change").
 *
 *   npm run eval                       # uses eval/questions.json
 *   npm run eval -- eval/other.json
 *
 * Calls the real model against the configured library. Exits non-zero when
 * fewer than 95% of questions pass.
 */
import fs from "node:fs/promises";
import { askLibrary } from "../src/lib/ask";
import { getDb } from "../src/lib/db";
import { gradeAnswer, type EvalQuestion } from "../src/lib/eval";

const TARGET = 0.95;

async function main() {
  const file = process.argv[2] ?? "eval/questions.json";
  const questions = JSON.parse(await fs.readFile(file, "utf8")) as EvalQuestion[];
  const db = await getDb();
  let passed = 0;
  for (const q of questions) {
    const record = await askLibrary(db, q.question, { askedBy: "eval" });
    const failures = gradeAnswer(q, record.answer);
    if (failures.length === 0) passed++;
    console.log(`${failures.length ? "✗" : "✓"} ${q.id}: ${q.question}`);
    for (const f of failures) console.log(`    ${f}`);
  }
  const rate = questions.length ? passed / questions.length : 0;
  console.log(`\n${passed}/${questions.length} passed (${(rate * 100).toFixed(0)}%; target ${TARGET * 100}%)`);
  process.exit(rate >= TARGET ? 0 : 1);
}

main();
