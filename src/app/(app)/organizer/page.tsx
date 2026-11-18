import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EventCard } from "@/components/event-card";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Manage events · Campus Events" };

/** Organizer workspace: every event this user owns, drafts included. */
export default async function OrganizerPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "STUDENT") redirect("/dashboard");

  const events = await prisma.event.findMany({
    where: user.role === "ADMIN" ? undefined : { organizerId: user.id },
    orderBy: { startsAt: "desc" },
    include: {
      organizer: { select: { name: true } },
      _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
    },
  });

  return (
    <>
      <PageHeader
        title="Manage events"
        description={
          user.role === "ADMIN"
            ? "All events in the system, including drafts from every organizer."
            : "Events you created. Publish a draft to open registration."
        }
        action={
          <Link href="/organizer/new" className="btn btn-primary">
            Create event
          </Link>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Create your first event, then publish it so students can register."
          action={
            <Link href="/organizer/new" className="btn btn-primary mt-2">
              Create event
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              href={`/organizer/${event.id}`}
              showStatus
              footer={
                <Link
                  href={`/organizer/${event.id}`}
                  className="font-semibold text-primary"
                >
                  Manage
                </Link>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
