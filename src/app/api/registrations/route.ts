import { prisma } from "@/lib/db";
import { ok, requireUser } from "@/lib/api";

/** GET /api/registrations — the signed-in student's own tickets. */
export async function GET() {
  const guard = await requireUser();
  if ("response" in guard) return guard.response;

  const registrations = await prisma.registration.findMany({
    where: { userId: guard.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          venue: true,
          category: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      },
      attendance: { select: { checkedInAt: true } },
    },
  });

  return ok({ registrations });
}
