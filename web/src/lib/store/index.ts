import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Db } from "@/lib/domain/types";
import { DATA_BACKEND } from "@/lib/config";
import { MemoryStore, type Store } from "./memory";
import { buildSeed } from "./seed";

const FILE = path.join(process.cwd(), ".data", "demo.json");

function load(): Db {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as Db;
  } catch {
    return buildSeed(new Date());
  }
}

function persist(db: Db) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, FILE);
  } catch {
    // Read-only filesystem (e.g. serverless preview): keep the demo in memory.
  }
}

const g = globalThis as unknown as { __huddleStore?: Store };

export function getStore(): Store {
  if (DATA_BACKEND !== "demo") {
    throw new Error(
      "DATA_BACKEND=supabase: the Postgres adapter isn't wired yet. See docs/LAUNCH_DEPENDENCIES.md. Use DATA_BACKEND=demo.",
    );
  }
  if (!g.__huddleStore) g.__huddleStore = new MemoryStore(load(), persist);
  return g.__huddleStore;
}

export function resetDemo() {
  const fresh = buildSeed(new Date());
  getStore().replace(fresh);
}
