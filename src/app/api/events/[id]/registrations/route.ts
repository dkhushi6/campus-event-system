import { prisma } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** GET /api/events/:id/registrations — attendee list for the event owner. */
export async function GET(_request: Request, { params }: Params) {
  const guard = await requireUser(["ORGANIZER", "ADMIN"]);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return fail("Event not found.", 404);

  if (event.organizerId !== guard.user.id && guard.user.role !== "ADMIN") {
    return fail("You can only view registrations for your own events.", 403);
  }

  const registrations = await prisma.registration.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          enrollmentNo: true,
          department: true,
        },
      },
      attendance: { select: { checkedInAt: true } },
    },
  });

  return ok({
    event: { id: event.id, title: event.title, capacity: event.capacity },
    registrations,
    summary: {
      registered: registrations.filter((r) => r.status === "CONFIRMED").length,
      cancelled: registrations.filter((r) => r.status === "CANCELLED").length,
      attended: registrations.filter((r) => r.attendance).length,
    },
  });
}
