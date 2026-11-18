"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui";

/**
 * Registration module — client control.
 * Surfaces the API's duplicate / capacity rejections directly to the student.
 */
export function RegisterButton({
  eventId,
  registered,
  disabled,
  disabledReason,
}: {
  eventId: string;
  registered: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"danger" | "success">("danger");

  async function submit(method: "POST" | "DELETE") {
    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/events/${eventId}/register`, { method });
    const data = await response.json().catch(() => ({}));
    setPending(false);

    if (!response.ok) {
      setTone("danger");
      setMessage(data.error ?? "Could not complete the request.");
      return;
    }

    setTone("success");
    setMessage(
      method === "POST"
        ? "Registration confirmed. Your QR ticket is in My tickets."
        : "Registration cancelled.",
    );
    router.refresh();
  }

  if (disabled) {
    return (
      <div className="grid gap-2">
        <button className="btn btn-primary" disabled>
          Registration closed
        </button>
        {disabledReason ? (
          <p className="text-xs text-muted">{disabledReason}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {registered ? (
        <button
          className="btn btn-danger"
          onClick={() => submit("DELETE")}
          disabled={pending}
        >
          {pending ? "Cancelling…" : "Cancel my registration"}
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={() => submit("POST")}
          disabled={pending}
        >
          {pending ? "Registering…" : "Register for this event"}
        </button>
      )}
      {message ? <Alert tone={tone}>{message}</Alert> : null}
    </div>
  );
}
