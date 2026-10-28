import type { Db } from "@/lib/domain/types";

export interface Store {
  read(): Db;
  transact<T>(fn: (db: Db) => T): Promise<T>;
  replace(db: Db): void;
}

/**
 * Serialises every write through one queue. Each transaction works on a copy
 * and is committed only if it finishes without throwing, so a failed rule
 * check never leaves half-applied changes behind.
 */
export class MemoryStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private db: Db,
    private onCommit: (db: Db) => void = () => {},
  ) {}

  read(): Db {
    return structuredClone(this.db);
  }

  transact<T>(fn: (db: Db) => T): Promise<T> {
    const run = this.queue.then(() => {
      const draft = structuredClone(this.db);
      const result = fn(draft);
      this.db = draft;
      this.onCommit(draft);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  replace(db: Db) {
    this.db = db;
    this.onCommit(db);
  }
}
