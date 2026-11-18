import { prisma } from "@/lib/db";
import { ok, requireUser } from "@/lib/api";

/** GET /api/notifications — in-app alert feed for the signed-in user. */
export async function GET() {
  const guard = await requireUser();
  if ("response" in guard) return guard.response;

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: guard.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: guard.user.id, readAt: null },
    }),
  ]);

  return ok({ notifications, unread });
}
