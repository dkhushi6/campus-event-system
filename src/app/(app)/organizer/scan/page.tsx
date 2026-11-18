import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { QrScanner } from "@/components/qr-scanner";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Scan tickets · Campus Events" };

type SearchParams = Promise<{ eventId?: string }>;

/** QR check-in module — organizer scanning screen. */
export default async function ScanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "STUDENT") redirect("/dashboard");

  const { eventId } = await searchParams;

  // Confirm the scanner is actually allowed to work on the requested event.
  const event = eventId
    ? await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, organizerId: true },
      })
    : null;

  const scopedEvent =
    event && (event.organizerId === user.id || user.role === "ADMIN")
      ? event
      : null;

  return (
    <>
      <PageHeader
        title="Scan QR tickets"
        description="Each scan is validated against the database before attendance is recorded. Duplicate, cancelled and forged tickets are rejected."
        action={
          scopedEvent ? (
            <Link href={`/organizer/${scopedEvent.id}`} className="btn btn-secondary">
              Back to event
            </Link>
          ) : null
        }
      />

      <QrScanner eventId={scopedEvent?.id} eventTitle={scopedEvent?.title} />
    </>
  );
}
