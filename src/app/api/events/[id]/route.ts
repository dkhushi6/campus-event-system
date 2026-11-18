import { prisma } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { eventSchema, fieldErrors } from "@/lib/validation";
import { notifyMany } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, name: true, email: true } },
      _count: { select: { registrations: true } },
    },
  });

  if (!event) return fail("Event not found.", 404);

  const isOwner = user?.id === event.organizerId;
  if (event.status !== "PUBLISHED" && !isOwner && user?.role !== "ADMIN") {
    return fail("Event not found.", 404);
  }

  return ok({ event });
}

/** PATCH /api/events/:id — only the owning organizer or an admin may edit. */
export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireUser(["ORGANIZER", "ADMIN"]);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return fail("Event not found.", 404);

  if (existing.organizerId !== guard.user.id && guard.user.role !== "ADMIN") {
    return fail("You can only edit events you created.", 403);
  }

  const parsed = eventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", 422, {
      fields: fieldErrors(parsed.error),
    });
  }

  const event = await prisma.event.update({ where: { id }, data: parsed.data });

  // Alerts module: tell confirmed attendees when a published event changes.
  const statusChanged = existing.status !== event.status;
  const scheduleChanged =
    existing.startsAt.getTime() !== event.startsAt.getTime() ||
    existing.venue !== event.venue;

  if (statusChanged || scheduleChanged) {
    const registrations = await prisma.registration.findMany({
      where: { eventId: id, status: "CONFIRMED" },
      select: { userId: true, user: { select: { email: true } } },
    });

    if (registrations.length > 0) {
      const cancelled = event.status === "CANCELLED";
      await notifyMany(
        registrations.map((r) => ({ userId: r.userId, email: r.user.email })),
        cancelled ? `Cancelled: ${event.title}` : `Updated: ${event.title}`,
        cancelled
          ? "This event has been cancelled by the organizer. Your ticket is no longer valid."
          : `New details — ${event.venue}, starting ${event.startsAt.toLocaleString()}.`,
        "SYSTEM",
      );
    }
  }

  return ok({ event });
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireUser(["ORGANIZER", "ADMIN"]);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return fail("Event not found.", 404);

  if (existing.organizerId !== guard.user.id && guard.user.role !== "ADMIN") {
    return fail("You can only delete events you created.", 403);
  }

  await prisma.event.delete({ where: { id } });
  return ok({ deleted: true });
}
