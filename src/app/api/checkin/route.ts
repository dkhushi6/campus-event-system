import { prisma } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/api";
import { checkinSchema, fieldErrors } from "@/lib/validation";
import { parseAndVerifyTicket } from "@/lib/tickets";
import { formatDateTime } from "@/lib/format";
import { Prisma } from "@prisma/client";

/**
 * POST /api/checkin — QR check-in module.
 *
 * A scan is only stored as attendance after every one of these passes:
 *   1. signature verifies (ticket was issued by this system)
 *   2. ticket code exists in the database
 *   3. registration is CONFIRMED, not cancelled
 *   4. the event is not cancelled
 *   5. the scanner owns the event (or is an admin)
 *   6. the ticket has not already been checked in
 *
 * Anything else is reported back as an invalid ticket and nothing is written.
 */
export async function POST(request: Request) {
  const guard = await requireUser(["ORGANIZER", "ADMIN"]);
  if ("response" in guard) return guard.response;

  const parsed = checkinSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid scan request.", 422, { fields: fieldErrors(parsed.error) });
  }

  // 1. Cryptographic validation of the scanned payload.
  const ticket = parseAndVerifyTicket(parsed.data.payload);
  if (!ticket.ok) {
    return fail(ticket.reason, 422, { result: "INVALID" });
  }

  // 2. Look the ticket up.
  const registration = await prisma.registration.findUnique({
    where: { ticketCode: ticket.ticketCode },
    include: {
      user: { select: { id: true, name: true, email: true, enrollmentNo: true } },
      event: {
        select: {
          id: true,
          title: true,
          venue: true,
          status: true,
          organizerId: true,
          startsAt: true,
        },
      },
      attendance: { select: { checkedInAt: true } },
    },
  });

  if (!registration) {
    return fail("Ticket not recognised. No matching registration found.", 404, {
      result: "INVALID",
    });
  }

  // 3-4. Registration and event must still be active.
  if (registration.status !== "CONFIRMED") {
    return fail("This registration was cancelled — entry denied.", 409, {
      result: "CANCELLED",
      attendee: registration.user,
      event: registration.event,
    });
  }
  if (registration.event.status === "CANCELLED") {
    return fail("This event has been cancelled — entry denied.", 409, {
      result: "CANCELLED",
      attendee: registration.user,
      event: registration.event,
    });
  }

  // 5. The scanner must be responsible for this event.
  const ownsEvent = registration.event.organizerId === guard.user.id;
  if (!ownsEvent && guard.user.role !== "ADMIN") {
    return fail("This ticket belongs to an event you do not manage.", 403, {
      result: "WRONG_EVENT",
      event: registration.event,
    });
  }

  // Optional guard for a scanner that is locked to one event in the UI.
  if (parsed.data.eventId && parsed.data.eventId !== registration.event.id) {
    return fail(
      `This ticket is for "${registration.event.title}", not the event you are scanning.`,
      409,
      { result: "WRONG_EVENT", event: registration.event },
    );
  }

  // 6. Reject a second scan of the same ticket.
  if (registration.attendance) {
    return fail(
      `Already checked in at ${formatDateTime(registration.attendance.checkedInAt)}.`,
      409,
      {
        result: "DUPLICATE",
        attendee: registration.user,
        event: registration.event,
        checkedInAt: registration.attendance.checkedInAt,
      },
    );
  }

  // All checks passed — record attendance.
  try {
    const attendance = await prisma.attendance.create({
      data: {
        registrationId: registration.id,
        checkedInById: guard.user.id,
      },
    });

    return ok({
      result: "CHECKED_IN",
      attendance,
      attendee: registration.user,
      event: registration.event,
      ticketCode: registration.ticketCode,
    });
  } catch (error) {
    // Two scanners hitting the same ticket simultaneously.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail("Already checked in moments ago.", 409, { result: "DUPLICATE" });
    }
    throw error;
  }
}
