import Link from "next/link";
import { formatRange } from "@/lib/format";
import { CATEGORY_LABELS, type EventCategory } from "@/lib/constants";
import { Badge, StatusBadge } from "@/components/ui";

export type EventCardData = {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  organizer?: { name: string } | null;
  _count: { registrations: number };
};

export function EventCard({
  event,
  href,
  showStatus = false,
  footer,
}: {
  event: EventCardData;
  href?: string;
  showStatus?: boolean;
  footer?: React.ReactNode;
}) {
  const seatsLeft = Math.max(0, event.capacity - event._count.registrations);
  const isPast = new Date(event.endsAt) < new Date();

  return (
    <article className="card flex flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">
          {CATEGORY_LABELS[event.category as EventCategory] ?? event.category}
        </Badge>
        {showStatus ? <StatusBadge status={event.status} /> : null}
        {isPast ? <Badge>finished</Badge> : null}
      </div>

      <h3 className="mt-2.5 font-semibold leading-snug">
        {href ? (
          <Link href={href} className="hover:text-primary">
            {event.title}
          </Link>
        ) : (
          event.title
        )}
      </h3>

      <p className="mt-1.5 line-clamp-2 text-sm text-muted">{event.description}</p>

      <dl className="mt-3 grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted">When</dt>
          <dd>{formatRange(event.startsAt, event.endsAt)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted">Where</dt>
          <dd>{event.venue}</dd>
        </div>
        {event.organizer ? (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted">By</dt>
            <dd>{event.organizer.name}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted">
        <span>
          {event._count.registrations} registered ·{" "}
          {seatsLeft === 0 ? "full" : `${seatsLeft} left`}
        </span>
        {footer}
      </div>
    </article>
  );
}
