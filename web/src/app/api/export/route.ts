import { NextResponse } from "next/server";
import { getCtx } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { exportAccount } from "@/lib/domain/ops";
import { DomainError } from "@/lib/domain/util";

export async function GET() {
  const ctx = await getCtx();
  try {
    const data = await getStore().transact((db) => exportAccount(db, ctx));
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="my-data-${ctx.now.toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse(e.message, { status: 401 });
    throw e;
  }
}
