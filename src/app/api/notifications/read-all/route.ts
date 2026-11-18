import { prisma } from "@/lib/db";
import { ok, requireUser } from "@/lib/api";

export async function POST() {
  const guard = await requireUser();
  if ("response" in guard) return guard.response;

  const { count } = await prisma.notification.updateMany({
    where: { userId: guard.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return ok({ marked: count });
}
