"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markAll() {
    setPending(true);
    await fetch("/api/notifications/read-all", { method: "POST" });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      className="btn btn-secondary"
      onClick={markAll}
      disabled={disabled || pending}
    >
      {pending ? "Marking…" : "Mark all as read"}
    </button>
  );
}
