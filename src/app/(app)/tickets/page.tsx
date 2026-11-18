import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { renderTicketQr } from "@/lib/tickets";
import { formatDateTime, formatRange } from "@/lib/format";
import { CATEGORY_LABELS, type EventCategory } from "@/lib/constants";
import { Badge, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "My tickets · Campus Events" };

/**
 * QR check-in module — attendee side.
 * Each confirmed registration renders its signed QR ticket as a data-URL PNG.
 */
export default async function TicketsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const registrations = await prisma.registration.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      event: true,
      attendance: { select: { checkedInAt: true } },
    },
  });

  const tickets = await Promise.all(
    registrations.map(async (registration) => ({
      registration,
      qr:
        registration.status === "CONFIRMED"
          ? await renderTicketQr(registration.ticketCode)
          : null,
    })),
  );

  return (
    <>
      <PageHeader
        title="My tickets"
        description="Show the QR code at the venue entrance. An organizer scans it to record your attendance."
      />

      {tickets.length === 0 ? (
        <EmptyState
          title="You have no tickets yet"
          description="Register for a published event and your QR ticket will appear here."
          action={
            <Link href="/events" className="btn btn-primary mt-2">
              Browse events
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tickets.map(({ registration, qr }) => {
            const { event, attendance } = registration;
            const cancelled = registration.status === "CANCELLED";

            return (
              <article
                key={registration.id}
                className={`card p-5 ${cancelled ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">
                    {CATEGORY_LABELS[event.category as EventCategory] ??
                      event.category}
                  </Badge>
                  <StatusBadge status={registration.status} />
                  {attendance ? <Badge tone="success">checked in</Badge> : null}
                  {event.status === "CANCELLED" ? (
                    <Badge tone="danger">event cancelled</Badge>
                  ) : null}
                </div>

                <h2 className="mt-2.5 font-semibold">
                  <Link href={`/events/${event.id}`} className="hover:text-primary">
                    {event.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {formatRange(event.startsAt, event.endsAt)}
                </p>
                <p className="text-sm text-muted">{event.venue}</p>

                <div className="mt-4 flex items-center gap-4 border-t pt-4">
                  {qr ? (
                    <Image
                      src={qr}
                      alt={`QR ticket ${registration.ticketCode}`}
                      width={128}
                      height={128}
                      unoptimized
                      className="size-32 shrink-0 rounded-lg bg-white p-1"
                    />
                  ) : (
                    <div className="grid size-32 shrink-0 place-items-center rounded-lg bg-surface-muted text-center text-xs text-muted">
                      Ticket cancelled
                    </div>
                  )}

                  <div className="min-w-0 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Ticket code
                    </p>
                    <code className="mt-0.5 block break-all text-xs font-semibold">
                      {registration.ticketCode}
                    </code>

                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      Attendance
                    </p>
                    <p className="mt-0.5 text-xs">
                      {attendance
                        ? formatDateTime(attendance.checkedInAt)
                        : "Not checked in yet"}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
