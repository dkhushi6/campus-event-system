import { prisma } from "@/lib/db";

/**
 * Reporting module.
 *
 * Every figure here is derived from stored registration and attendance rows —
 * nothing is estimated — so the numbers in the admin dashboard can be quoted
 * directly in the project report.
 */

export type EventReportRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  venue: string;
  startsAt: Date;
  capacity: number;
  organizer: string;
  registered: number;
  cancelled: number;
  attended: number;
  attendanceRate: number;
  fillRate: number;
};

export type SystemReport = {
  totals: {
    users: number;
    students: number;
    organizers: number;
    admins: number;
    events: number;
    publishedEvents: number;
    registrations: number;
    attendance: number;
    attendanceRate: number;
  };
  byCategory: { category: string; events: number; registrations: number }[];
  events: EventReportRow[];
};

export async function buildSystemReport(
  options: { organizerId?: string } = {},
): Promise<SystemReport> {
  const eventWhere = options.organizerId
    ? { organizerId: options.organizerId }
    : undefined;

  const [users, events] = await Promise.all([
    prisma.user.findMany({ select: { role: true } }),
    prisma.event.findMany({
      where: eventWhere,
      orderBy: { startsAt: "desc" },
      include: {
        organizer: { select: { name: true } },
        registrations: { select: { status: true, attendance: { select: { id: true } } } },
      },
    }),
  ]);

  const rows: EventReportRow[] = events.map((event) => {
    const confirmed = event.registrations.filter((r) => r.status === "CONFIRMED");
    const attended = confirmed.filter((r) => r.attendance).length;

    return {
      id: event.id,
      title: event.title,
      category: event.category,
      status: event.status,
      venue: event.venue,
      startsAt: event.startsAt,
      capacity: event.capacity,
      organizer: event.organizer.name,
      registered: confirmed.length,
      cancelled: event.registrations.length - confirmed.length,
      attended,
      attendanceRate: confirmed.length
        ? Math.round((attended / confirmed.length) * 100)
        : 0,
      fillRate: event.capacity
        ? Math.round((confirmed.length / event.capacity) * 100)
        : 0,
    };
  });

  const registrations = rows.reduce((sum, r) => sum + r.registered, 0);
  const attendance = rows.reduce((sum, r) => sum + r.attended, 0);

  const categoryMap = new Map<string, { events: number; registrations: number }>();
  for (const row of rows) {
    const entry = categoryMap.get(row.category) ?? { events: 0, registrations: 0 };
    entry.events += 1;
    entry.registrations += row.registered;
    categoryMap.set(row.category, entry);
  }

  return {
    totals: {
      users: users.length,
      students: users.filter((u) => u.role === "STUDENT").length,
      organizers: users.filter((u) => u.role === "ORGANIZER").length,
      admins: users.filter((u) => u.role === "ADMIN").length,
      events: rows.length,
      publishedEvents: rows.filter((r) => r.status === "PUBLISHED").length,
      registrations,
      attendance,
      attendanceRate: registrations
        ? Math.round((attendance / registrations) * 100)
        : 0,
    },
    byCategory: [...categoryMap.entries()]
      .map(([category, value]) => ({ category, ...value }))
      .sort((a, b) => b.registrations - a.registrations),
    events: rows,
  };
}
