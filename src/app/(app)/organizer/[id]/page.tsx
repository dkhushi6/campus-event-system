import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime, formatRange } from "@/lib/format";
import { EventForm } from "@/components/event-form";
import { RemindButton } from "@/components/remind-button";
import { Badge, PageHeader, StatCard, StatusBadge } from "@/components/ui";

type Params = { params: Promise<{ id: string }> };

/** Organizer detail view: edit the event and work through the attendee list. */
export default async function ManageEventPage({ params }: Params) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "STUDENT") redirect("/dashboard");

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, name: true } },
      registrations: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              enrollmentNo: true,
              department: true,
            },
          },
          attendance: { select: { checkedInAt: true } },
        },
      },
    },
  });

  if (!event) notFound();
  if (event.organizerId !== user.id && user.role !== "ADMIN") notFound();

  const confirmed = event.registrations.filter((r) => r.status === "CONFIRMED");
  const attended = confirmed.filter((r) => r.attendance);
  const attendanceRate = confirmed.length
    ? Math.round((attended.length / confirmed.length) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title={event.title}
        description={`${formatRange(event.startsAt, event.endsAt)} · ${event.venue}`}
        action={
          <div className="flex gap-2">
            <Link href={`/events/${event.id}`} className="btn btn-secondary">
              Public page
            </Link>
            <Link
              href={`/organizer/scan?eventId=${event.id}`}
              className="btn btn-primary"
            >
              Scan tickets
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={event.status} />
        {user.role === "ADMIN" && event.organizerId !== user.id ? (
          <Badge>organizer: {event.organizer.name}</Badge>
        ) : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Registered"
          value={confirmed.length}
          hint={`of ${event.capacity} places`}
        />
        <StatCard label="Checked in" value={attended.length} hint="attendance stored" />
        <StatCard label="Attendance rate" value={`${attendanceRate}%`} />
        <StatCard
          label="Cancelled"
          value={event.registrations.length - confirmed.length}
          hint="withdrawn tickets"
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="mb-3 font-semibold">
            Attendee list ({event.registrations.length})
          </h2>

          {event.registrations.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              No registrations yet.
              {event.status !== "PUBLISHED"
                ? " Publish the event to open registration."
                : null}
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Enrollment</th>
                    <th>Ticket</th>
                    <th>Status</th>
                    <th>Checked in</th>
                  </tr>
                </thead>
                <tbody>
                  {event.registrations.map((registration) => (
                    <tr key={registration.id}>
                      <td>
                        <p className="font-medium">{registration.user.name}</p>
                        <p className="text-xs text-muted">{registration.user.email}</p>
                      </td>
                      <td className="text-xs">
                        {registration.user.enrollmentNo ?? "—"}
                        {registration.user.department ? (
                          <p className="text-muted">{registration.user.department}</p>
                        ) : null}
                      </td>
                      <td>
                        <code className="text-xs">{registration.ticketCode}</code>
                      </td>
                      <td>
                        <StatusBadge status={registration.status} />
                      </td>
                      <td className="text-xs">
                        {registration.attendance ? (
                          <span className="font-medium text-success">
                            {formatDateTime(registration.attendance.checkedInAt)}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="grid h-fit gap-4">
          <div className="card p-5">
            <h2 className="font-semibold">Alerts</h2>
            <p className="mb-3 mt-1 text-sm text-muted">
              Notify confirmed attendees who have not checked in yet.
            </p>
            <RemindButton eventId={event.id} />
          </div>

          <div className="card p-5">
            <h2 className="mb-4 font-semibold">Edit event</h2>
            <EventForm event={event} />
          </div>
        </aside>
      </div>
    </>
  );
}
