import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { buildSystemReport } from "@/lib/reports";
import { formatDateTime } from "@/lib/format";
import { CATEGORY_LABELS, type EventCategory } from "@/lib/constants";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export const metadata = { title: "Reports · Campus Events" };

/**
 * Reporting module.
 * Every number below is computed from stored registration and attendance rows.
 */
export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/dashboard");

  const report = await buildSystemReport();
  const maxCategory = Math.max(
    1,
    ...report.byCategory.map((row) => row.registrations),
  );

  return (
    <>
      <PageHeader
        title="Registration and attendance reports"
        description="Figures are derived from stored records — no estimates. Use these for the Results and Testing section of the project report."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={report.totals.users}
          hint={`${report.totals.students} students · ${report.totals.organizers} organizers`}
        />
        <StatCard
          label="Events"
          value={report.totals.events}
          hint={`${report.totals.publishedEvents} published`}
        />
        <StatCard
          label="Registrations"
          value={report.totals.registrations}
          hint="confirmed tickets"
        />
        <StatCard
          label="Attendance"
          value={report.totals.attendance}
          hint={`${report.totals.attendanceRate}% of registrations`}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <h2 className="mb-3 font-semibold">Registrations by category</h2>
          {report.byCategory.length === 0 ? (
            <EmptyState title="No events yet" />
          ) : (
            <div className="card grid gap-3 p-5">
              {report.byCategory.map((row) => (
                <div key={row.category}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      {CATEGORY_LABELS[row.category as EventCategory] ?? row.category}
                    </span>
                    <span className="tabular-nums text-muted">
                      {row.registrations} reg · {row.events} event
                      {row.events === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-surface-muted"
                    role="img"
                    aria-label={`${row.registrations} registrations`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.round((row.registrations / maxCategory) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-semibold">Per-event report</h2>
          {report.events.length === 0 ? (
            <EmptyState
              title="No events to report on"
              description="Create and publish an event, then register and check in to populate this table."
            />
          ) : (
            <div className="card overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Status</th>
                    <th className="text-right">Cap.</th>
                    <th className="text-right">Reg.</th>
                    <th className="text-right">Attended</th>
                    <th className="text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.events.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          href={`/organizer/${row.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {row.title}
                        </Link>
                        <p className="text-xs text-muted">
                          {formatDateTime(row.startsAt)} · {row.organizer}
                        </p>
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="text-right tabular-nums">{row.capacity}</td>
                      <td className="text-right tabular-nums">{row.registered}</td>
                      <td className="text-right tabular-nums">{row.attended}</td>
                      <td className="text-right tabular-nums font-semibold">
                        {row.attendanceRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
