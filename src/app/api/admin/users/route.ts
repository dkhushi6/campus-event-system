import { prisma } from "@/lib/db";
import { ok, requireUser } from "@/lib/api";

/** GET /api/admin/users — Administration module: user directory. */
export async function GET(request: Request) {
  const guard = await requireUser(["ADMIN"]);
  if ("response" in guard) return guard.response;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { enrollmentNo: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      enrollmentNo: true,
      department: true,
      active: true,
      createdAt: true,
      _count: { select: { registrations: true, organizedEvents: true } },
    },
  });

  return ok({ users });
}
