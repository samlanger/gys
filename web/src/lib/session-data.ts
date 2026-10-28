import "server-only";
import { getCtx } from "@/lib/auth/session";
import { getStore } from "@/lib/store";

/** One read of the current viewer + a snapshot for a server component render. */
export async function load() {
  const ctx = await getCtx();
  const db = getStore().read();
  const user = ctx.userId ? db.users.find((u) => u.id === ctx.userId) ?? null : null;
  return { ctx, db, user };
}
