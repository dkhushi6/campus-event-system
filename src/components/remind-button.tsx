"use client";

import { useState } from "react";
import { Alert } from "@/components/ui";

/** Alerts module — manual reminder trigger for an organizer. */
export function RemindButton({ eventId }: { eventId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "danger">("success");

  async function send() {
    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/events/${eventId}/remind`, {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);

    if (!response.ok) {
      setTone("danger");
      setMessage(data.error ?? "Could not send reminders.");
      return;
    }

    setTone("success");
    setMessage(
      data.sent === 0
        ? "No reminders to send — everyone has already checked in."
        : `Reminder sent to ${data.sent} attendee${data.sent === 1 ? "" : "s"}.`,
    );
  }

  return (
    <div className="grid gap-2">
      <button className="btn btn-secondary" onClick={send} disabled={pending}>
        {pending ? "Sending…" : "Send reminder to attendees"}
      </button>
      {message ? <Alert tone={tone}>{message}</Alert> : null}
    </div>
  );
}
