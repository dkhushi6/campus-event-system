import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRange } from "@/lib/format";
import { CATEGORY_LABELS, type EventCategory } from "@/lib/constants";
import { Badge } from "@/components/ui";

const MODULES = [
  {
    name: "Events",
    detail:
      "Organizers publish events; students search and filter the listing by category and date.",
  },
  {
    name: "Registration",
    detail:
      "Online registration with a database-level duplicate check and capacity limits.",
  },
  {
    name: "QR check-in",
    detail:
      "Each ticket carries a signed QR code that is validated before attendance is stored.",
  },
  {
    name: "Alerts",
    detail:
      "Confirmation and reminder notifications reach attendees in-app and by email.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED", endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 3,
    include: { _count: { select: { registrations: true } } },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-bold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">
              CE
            </span>
            Campus Events
          </div>
          <div className="flex gap-2">
            <Link href="/login" className="btn btn-secondary">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-14">
        <section className="max-w-3xl">
          <Badge tone="primary">Software Engineering mini project</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Campus Event Management System
          </h1>
          <p className="mt-4 text-lg text-muted">
            One platform to publish, discover and manage campus events. Students
            register online and receive a QR ticket, organizers verify entry by
            scanning it, and administrators get registration and attendance
            reports built from stored records.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">
              Get started
            </Link>
            <Link href="/login" className="btn btn-secondary">
              I already have an account
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Integrated modules
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((module) => (
              <div key={module.name} className="card p-5">
                <p className="font-semibold">{module.name}</p>
                <p className="mt-1.5 text-sm text-muted">{module.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {events.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Upcoming events
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <div key={event.id} className="card p-5">
                  <Badge tone="primary">
                    {CATEGORY_LABELS[event.category as EventCategory] ??
                      event.category}
                  </Badge>
                  <p className="mt-2 font-semibold">{event.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatRange(event.startsAt, event.endsAt)}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{event.venue}</p>
                  <p className="mt-3 text-xs text-muted">
                    {event._count.registrations} of {event.capacity} places taken
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              <Link href="/login" className="font-semibold text-primary">
                Sign in
              </Link>{" "}
              to register and collect your QR ticket.
            </p>
          </section>
        ) : null}
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted">
        Campus Event Management System · Next.js, Prisma and SQLite
      </footer>
    </div>
  );
}
