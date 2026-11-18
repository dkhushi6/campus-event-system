import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EventForm } from "@/components/event-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Create event · Campus Events" };

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "STUDENT") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Create event"
        description="Save as a draft while you finalise details, then switch the status to Published to open registration."
      />
      <div className="card p-6">
        <EventForm />
      </div>
    </div>
  );
}
