import { ok, requireUser } from "@/lib/api";
import { buildSystemReport } from "@/lib/reports";

/** GET /api/admin/reports — registration and attendance report data. */
export async function GET() {
  const guard = await requireUser(["ADMIN"]);
  if ("response" in guard) return guard.response;

  return ok(await buildSystemReport());
}
