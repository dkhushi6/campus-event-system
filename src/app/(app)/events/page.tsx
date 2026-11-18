import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { EventFilters } from "@/components/event-filters";
import { EventCard } from "@/components/event-card";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Events · Campus Events" };

type SearchParams = Promise<{ q?: string; category?: string; when?: string }>;

/**
 * Events module — public listing.
 * Students only ever see PUBLISHED events; search and filters run in SQL.
 */
export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", category = "", when = "upcoming" } = await searchParams;
  const user = await getCurrentUser();

  const where: Prisma.EventWhereInput = { status: "PUBLISHED" };

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { venue: { contains: q } },
    ];
  }
  if (category && EVENT_CATEGORIES.includes(category as never)) {
    where.category = category;
  }
  if (when === "upcoming") where.endsAt = { gte: new Date() };
  if (when === "past") where.endsAt = { lt: new Date() };

  const [events, myRegistrations] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: when === "past" ? "desc" : "asc" },
      include: {
        organizer: { select: { name: true } },
        _count: { select: { registrations: true } },
      },
    }),
    user
      ? prisma.registration.findMany({
          where: { userId: user.id, status: "CONFIRMED" },
          select: { eventId: true },
        })
      : Promise.resolve([]),
  ]);

  const registeredIds = new Set(myRegistrations.map((r) => r.eventId));

  return (
    <>
      <PageHeader
        title="Campus events"
        description="Browse published events, filter by category or date, and register to receive a QR ticket."
      />

      <Suspense fallback={<div className="card mb-5 h-20" />}>
        <EventFilters />
      </Suspense>

      {events.length === 0 ? (
        <EmptyState
          title="No events match your filters"
          description="Try a different category, widen the date range, or clear the search box."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            {events.length} event{events.length === 1 ? "" : "s"} found
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                href={`/events/${event.id}`}
                footer={
                  registeredIds.has(event.id) ? (
                    <span className="font-semibold text-success">Registered</span>
                  ) : (
                    <Link
                      href={`/events/${event.id}`}
                      className="font-semibold text-primary"
                    >
                      View details
                    </Link>
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
