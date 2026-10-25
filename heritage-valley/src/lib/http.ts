import { NextResponse } from "next/server";
import { currentSession } from "./auth";
import { canEdit, type Session } from "./session";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Returns the session, or a 401/403 response when it does not meet `need`. */
export async function requireRole(need: "any" | "editor" | "admin"): Promise<Session | NextResponse> {
  const session = await currentSession();
  if (!session) return jsonError("Sign in required", 401);
  if (need === "editor" && !canEdit(session)) return jsonError("Only admins and facilitators can do this", 403);
  if (need === "admin" && session.role !== "admin") return jsonError("Only admins can do this", 403);
  return session;
}
