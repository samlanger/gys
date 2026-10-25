import fs from "node:fs/promises";
import path from "node:path";

/** Minimal query interface shared by node-postgres and PGlite. */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
}

const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: url });
    return {
      query: async (sql, params) => {
        const res = await pool.query(sql, params as unknown[]);
        return { rows: res.rows };
      },
      exec: async (sql) => {
        await pool.query(sql);
      },
    };
  }
  // Local development: embedded Postgres (PGlite) persisted to disk.
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), "storage", "pgdata");
  return wrapPglite(new PGlite(dataDir === "memory://" ? undefined : dataDir));
}

export function wrapPglite(pglite: {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
}): Db {
  return {
    query: async (sql, params) => {
      const res = await pglite.query(sql, params);
      return { rows: res.rows as never[] };
    },
    exec: async (sql) => {
      await pglite.exec(sql);
    },
  };
}

export async function applySchema(db: Db): Promise<void> {
  await db.exec(await fs.readFile(SCHEMA_PATH, "utf8"));
}

// Cache the connection across hot reloads in development.
const globalForDb = globalThis as unknown as { hvDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.hvDb ??= connect().then(async (db) => {
    await applySchema(db);
    return db;
  });
  return globalForDb.hvDb;
}

/** Test hook: replace the shared connection. */
export function setDb(db: Db): void {
  globalForDb.hvDb = Promise.resolve(db);
}
