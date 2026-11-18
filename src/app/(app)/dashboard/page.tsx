import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildSystemReport } from "@/lib/reports";
import { formatRange, relativeTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import { Badge, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export const metadata = { title: "Dashboard · Campus Events" };

/** Role-aware landing page: each role sees the figures relevant to its work. */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [myRegistrations, upcoming, recentAlerts] = await Promise.all([
    prisma.registration.findMany({
      where: { userId: user.id, status: "CONFIRMED" },
      include: {
        event: { select: { id: true, title: true, venue: true, startsAt: true, endsAt: true } },
        attendance: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.event.findMany({
      where: { status: "PUBLISHED", endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 4,
      include: { _count: { select: { registrations: true } } },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const organizerReport =
    user.role === "ORGANIZER"
      ? await buildSystemReport({ organizerId: user.id })
      : user.role === "ADMIN"
        ? await buildSystemReport()
        : null;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`You are signed in as ${ROLE_LABELS[user.role]}.`}
        action={
          user.role === "STUDENT" ? (
            <Link href="/events" className="btn btn-primary">
              Browse events
            </Link>
          ) : (
            <Link href="/organizer/new" className="btn btn-primary">
              Create event
            </Link>
          )
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {organizerReport ? (
          <>
            <StatCard
              label={user.role === "ADMIN" ? "Events" : "My events"}
              value={organizerReport.totals.events}
              hint={`${organizerReport.totals.publishedEvents} published`}
            />
            <StatCard
              label="Registrations"
              value={organizerReport.totals.registrations}
              hint="confirmed tickets issued"
            />
            <StatCard
              label="Checked in"
              value={organizerReport.totals.attendance}
              hint="attendance records stored"
            />
            <StatCard
              label="Attendance rate"
              value={`${organizerReport.totals.attendanceRate}%`}
              hint="checked in ÷ registered"
            />
          </>
        ) : (
          <>
            <StatCard
              label="My registrations"
              value={myRegistrations.length}
              hint="confirmed tickets"
            />
            <StatCard
              label="Events attended"
              value={myRegistrations.filter((r) => r.attendance).length}
              hint="QR check-ins recorded"
            />
            <StatCard
              label="Upcoming for me"
              value={
                myRegistrations.filter((r) => new Date(r.event.endsAt) >= new Date())
                  .length
              }
              hint="still to come"
            />
            <StatCard
              label="Open events"
              value={upcoming.length}
              hint="published and upcoming"
            />
          </>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">
              {user.role === "STUDENT" ? "Upcoming events" : "Your recent events"}
            </h2>
            <Link
              href={user.role === "STUDENT" ? "/events" : "/organizer"}
              className="text-sm font-semibold text-primary"
            >
              View all
            </Link>
          </div>

          {user.role === "STUDENT" ? (
            upcoming.length === 0 ? (
              <EmptyState
                title="No published events right now"
                description="Check back soon — organizers publish new events regularly."
              />
            ) : (
              <div className="card divide-y">
                {upcoming.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between gap-3 p-4 hover:bg-surface-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="text-xs text-muted">
                        {formatRange(event.startsAt, event.endsAt)} · {event.venue}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {event._count.registrations}/{event.capacity}
                    </span>
                  </Link>
                ))}
              </div>
            )
          ) : organizerReport && organizerReport.events.length > 0 ? (
            <div className="card overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Status</th>
                    <th className="text-right">Reg.</th>
                    <th className="text-right">Attended</th>
                  </tr>
                </thead>
                <tbody>
                  {organizerReport.events.slice(0, 6).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          href={`/organizer/${row.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="text-right tabular-nums">{row.registered}</td>
                      <td className="text-right tabular-nums">
                        {row.attended} ({row.attendanceRate}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="You have not created any events yet"
              description="Create an event, publish it, and students will be able to register."
              action={
                <Link href="/organizer/new" className="btn btn-primary mt-2">
                  Create event
                </Link>
              }
            />
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent alerts</h2>
            <Link href="/notifications" className="text-sm font-semibold text-primary">
              View all
            </Link>
          </div>

          {recentAlerts.length === 0 ? (
            <EmptyState title="No alerts yet" />
          ) : (
            <div className="card divide-y">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{alert.title}</p>
                    {!alert.readAt ? <Badge tone="primary">new</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">{alert.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {relativeTime(alert.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
