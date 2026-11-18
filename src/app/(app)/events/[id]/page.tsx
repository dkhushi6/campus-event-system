import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatRange } from "@/lib/format";
import { CATEGORY_LABELS, type EventCategory } from "@/lib/constants";
import { Badge, StatusBadge } from "@/components/ui";
import { RegisterButton } from "@/components/register-button";

type Params = { params: Promise<{ id: string }> };

export default async function EventDetailPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, name: true, email: true } },
      _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
    },
  });

  if (!event) notFound();

  const isOwner = user?.id === event.organizerId;
  const isAdmin = user?.role === "ADMIN";

  // Drafts and cancelled events stay hidden from everyone but their owner.
  if (event.status !== "PUBLISHED" && !isOwner && !isAdmin) notFound();

  const registration = user
    ? await prisma.registration.findUnique({
        where: { userId_eventId: { userId: user.id, eventId: id } },
        include: { attendance: { select: { checkedInAt: true } } },
      })
    : null;

  const isRegistered = registration?.status === "CONFIRMED";
  const seatsLeft = Math.max(0, event.capacity - event._count.registrations);
  const hasEnded = event.endsAt < new Date();

  const closedReason = hasEnded
    ? "This event has already finished."
    : event.status !== "PUBLISHED"
      ? "This event is not open for registration yet."
      : isOwner
        ? "You are the organizer of this event."
        : seatsLeft === 0 && !isRegistered
          ? "All places have been taken."
          : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <article>
        <Link href="/events" className="text-sm font-medium text-muted hover:text-primary">
          ← Back to events
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            {CATEGORY_LABELS[event.category as EventCategory] ?? event.category}
          </Badge>
          <StatusBadge status={event.status} />
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">{event.title}</h1>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { label: "Date and time", value: formatRange(event.startsAt, event.endsAt) },
            { label: "Venue", value: event.venue },
            { label: "Organizer", value: event.organizer.name },
            {
              label: "Places",
              value: `${event._count.registrations} registered of ${event.capacity}`,
            },
          ].map((item) => (
            <div key={item.label} className="card p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {item.label}
              </dt>
              <dd className="mt-1 text-sm font-medium">{item.value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            About this event
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
            {event.description}
          </p>
        </section>
      </article>

      <aside className="grid h-fit gap-4">
        <div className="card p-5">
          <h2 className="font-semibold">Registration</h2>

          {registration?.attendance ? (
            <p className="mt-2 text-sm text-success">
              Attendance recorded — you checked in for this event.
            </p>
          ) : isRegistered ? (
            <p className="mt-2 text-sm text-muted">
              You are registered. Ticket{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                {registration.ticketCode}
              </code>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Register to receive a QR ticket for entry.
            </p>
          )}

          <div className="mt-4">
            <RegisterButton
              eventId={event.id}
              registered={isRegistered}
              disabled={Boolean(closedReason) && !isRegistered}
              disabledReason={closedReason ?? undefined}
            />
          </div>

          {isRegistered ? (
            <Link
              href="/tickets"
              className="mt-3 block text-center text-sm font-semibold text-primary"
            >
              View my QR ticket
            </Link>
          ) : null}
        </div>

        {isOwner || isAdmin ? (
          <div className="card p-5">
            <h2 className="font-semibold">Organizer tools</h2>
            <div className="mt-3 grid gap-2">
              <Link href={`/organizer/${event.id}`} className="btn btn-secondary">
                Manage event
              </Link>
              <Link href={`/organizer/scan?eventId=${event.id}`} className="btn btn-secondary">
                Scan tickets
              </Link>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
