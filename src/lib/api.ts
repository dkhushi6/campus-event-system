import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { Role } from "@/lib/constants";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

type Guarded = Awaited<ReturnType<typeof getCurrentUser>>;

/**
 * Route-handler guard. Returns either the authenticated user or a ready-to-send
 * error response, so handlers read as:
 *
 *   const guard = await requireUser(["ORGANIZER", "ADMIN"]);
 *   if ("response" in guard) return guard.response;
 */
export async function requireUser(
  allowed?: readonly Role[],
): Promise<{ user: NonNullable<Guarded> } | { response: NextResponse }> {
  const user = await getCurrentUser();

  if (!user) {
    return { response: fail("You must be signed in.", 401) };
  }
  if (allowed && !allowed.includes(user.role)) {
    return { response: fail("You do not have permission to do this.", 403) };
  }
  return { user };
}
