"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";

/** Administration module — inline role and activation controls. */
export function UserRowActions({
  userId,
  role,
  active,
  isSelf,
}: {
  userId: string;
  role: Role;
  active: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    setError(null);

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    setPending(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Update failed.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <select
          className="select w-36"
          value={role}
          disabled={pending || isSelf}
          onChange={(event) => patch({ role: event.target.value })}
          aria-label="Change role"
        >
          {ROLES.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </select>

        <button
          className={active ? "btn btn-danger" : "btn btn-secondary"}
          disabled={pending || isSelf}
          onClick={() => patch({ active: !active })}
        >
          {active ? "Deactivate" : "Activate"}
        </button>
      </div>

      {isSelf ? (
        <p className="text-xs text-muted">Your own account cannot be changed here.</p>
      ) : null}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
