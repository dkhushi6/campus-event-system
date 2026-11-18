import { prisma } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/api";
import { generateTicketCode } from "@/lib/tickets";
import { notifyUser } from "@/lib/notifications";
import { formatRange } from "@/lib/format";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/events/:id/register — Registration module.
 *
 * Validation order mirrors Figure 4 of the project report:
 *   select event -> submit registration -> duplicate check -> issue QR ticket.
 *
 * Duplicates are blocked twice over: an explicit lookup produces a friendly
 * message, and the @@unique([userId, eventId]) constraint catches the race
 * where two requests arrive at the same moment (Prisma error P2002).
 */
export async function POST(_request: Request, { params }: Params) {
  const guard = await requireUser();
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });

  if (!event) return fail("Event not found.", 404);
  if (event.status !== "PUBLISHED") {
    return fail("Registration is not open for this event.", 409);
  }
  if (event.endsAt < new Date()) {
    return fail("This event has already ended.", 409);
  }
  if (event.organizerId === guard.user.id) {
    return fail("You cannot register for an event you are organising.", 409);
  }

  const existing = await prisma.registration.findUnique({
    where: { userId_eventId: { userId: guard.user.id, eventId: id } },
  });

  if (existing) {
    if (existing.status === "CONFIRMED") {
      return fail("You have already registered for this event.", 409, {
        duplicate: true,
        registrationId: existing.id,
      });
    }

    // A previously cancelled registration is reinstated with a fresh ticket
    // rather than creating a second row for the same (user, event) pair.
    const reinstated = await prisma.registration.update({
      where: { id: existing.id },
      data: { status: "CONFIRMED", ticketCode: generateTicketCode() },
    });

    await notifyUser({
      userId: guard.user.id,
      email: guard.user.email,
      type: "CONFIRMATION",
      title: `Registration confirmed: ${event.title}`,
      body: `Your ticket ${reinstated.ticketCode} is valid for ${event.venue} on ${formatRange(event.startsAt, event.endsAt)}.`,
    });

    return ok({ registration: reinstated, reinstated: true }, 201);
  }

  if (event._count.registrations >= event.capacity) {
    return fail("This event is full.", 409, { full: true });
  }

  try {
    const registration = await prisma.registration.create({
      data: {
        userId: guard.user.id,
        eventId: id,
        ticketCode: generateTicketCode(),
      },
    });

    // Alerts module: confirmation on successful registration.
    await notifyUser({
      userId: guard.user.id,
      email: guard.user.email,
      type: "CONFIRMATION",
      title: `Registration confirmed: ${event.title}`,
      body: `Your ticket ${registration.ticketCode} is valid for ${event.venue} on ${formatRange(event.startsAt, event.endsAt)}. Show the QR code at the entrance.`,
    });

    return ok({ registration }, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail("You have already registered for this event.", 409, {
        duplicate: true,
      });
    }
    throw error;
  }
}

/** DELETE /api/events/:id/register — a student cancels their own registration. */
export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireUser();
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const registration = await prisma.registration.findUnique({
    where: { userId_eventId: { userId: guard.user.id, eventId: id } },
    include: { attendance: true, event: { select: { title: true } } },
  });

  if (!registration || registration.status === "CANCELLED") {
    return fail("You are not registered for this event.", 404);
  }
  if (registration.attendance) {
    return fail("Attendance is already recorded — this ticket cannot be cancelled.", 409);
  }

  await prisma.registration.update({
    where: { id: registration.id },
    data: { status: "CANCELLED" },
  });

  await notifyUser({
    userId: guard.user.id,
    email: guard.user.email,
    type: "SYSTEM",
    title: `Registration cancelled: ${registration.event.title}`,
    body: "Your ticket has been cancelled and will no longer pass check-in.",
  });

  return ok({ cancelled: true });
}
