import { prisma } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/api";
import { notifyMany } from "@/lib/notifications";
import { formatRange } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/events/:id/remind — Alerts module.
 * Sends a reminder to every confirmed attendee who has not yet checked in.
 */
export async function POST(_request: Request, { params }: Params) {
  const guard = await requireUser(["ORGANIZER", "ADMIN"]);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return fail("Event not found.", 404);

  if (event.organizerId !== guard.user.id && guard.user.role !== "ADMIN") {
    return fail("You can only send reminders for your own events.", 403);
  }

  const recipients = await prisma.registration.findMany({
    where: { eventId: id, status: "CONFIRMED", attendance: null },
    select: { userId: true, user: { select: { email: true } } },
  });

  const sent = await notifyMany(
    recipients.map((r) => ({ userId: r.userId, email: r.user.email })),
    `Reminder: ${event.title}`,
    `${event.title} takes place at ${event.venue} — ${formatRange(event.startsAt, event.endsAt)}. Bring your QR ticket.`,
    "REMINDER",
  );

  return ok({ sent });
}
