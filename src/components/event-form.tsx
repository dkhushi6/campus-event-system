"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORY_LABELS, EVENT_CATEGORIES, EVENT_STATUSES } from "@/lib/constants";
import { toDateTimeLocal } from "@/lib/format";
import { Alert, Field } from "@/components/ui";

export type EventFormValues = {
  id?: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  startsAt: Date | string;
  endsAt: Date | string;
  capacity: number;
  status: string;
};

/** Events module — create / edit form, shared by both organizer screens. */
export function EventForm({ event }: { event?: EventFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(event?.id);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);
    setFields({});

    const form = new FormData(formEvent.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const response = await fetch(
      isEdit ? `/api/events/${event?.id}` : "/api/events",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Could not save the event.");
      setFields(data.fields ?? {});
      setPending(false);
      return;
    }

    router.push(`/organizer/${data.event.id}`);
    router.refresh();
  }

  async function onDelete() {
    setPending(true);
    const response = await fetch(`/api/events/${event?.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Could not delete the event.");
      setPending(false);
      return;
    }
    router.push("/organizer");
    router.refresh();
  }

  // Default a new event to tomorrow 10:00–12:00 so the form is usable at once.
  // Computed in a lazy state initialiser: reading the clock during render would
  // produce a different value on every re-render.
  const [defaults] = useState(() => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    start.setHours(10, 0, 0, 0);
    return { start, end: new Date(start.getTime() + 2 * 60 * 60 * 1000) };
  });

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      {error ? <Alert>{error}</Alert> : null}

      <Field label="Event title" htmlFor="title" error={fields.title}>
        <input
          id="title"
          name="title"
          className="input"
          required
          defaultValue={event?.title}
          placeholder="Annual Hackathon 2026"
        />
      </Field>

      <Field label="Description" htmlFor="description" error={fields.description}>
        <textarea
          id="description"
          name="description"
          className="textarea"
          rows={5}
          required
          defaultValue={event?.description}
          placeholder="What happens at the event, who should attend, what to bring…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category" error={fields.category}>
          <select
            id="category"
            name="category"
            className="select"
            defaultValue={event?.category ?? "TECHNICAL"}
          >
            {EVENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Venue" htmlFor="venue" error={fields.venue}>
          <input
            id="venue"
            name="venue"
            className="input"
            required
            defaultValue={event?.venue}
            placeholder="Seminar Hall B, Block 3"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts at" htmlFor="startsAt" error={fields.startsAt}>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            className="input"
            required
            defaultValue={toDateTimeLocal(event?.startsAt ?? defaults.start)}
          />
        </Field>

        <Field label="Ends at" htmlFor="endsAt" error={fields.endsAt}>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            className="input"
            required
            defaultValue={toDateTimeLocal(event?.endsAt ?? defaults.end)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Capacity"
          htmlFor="capacity"
          error={fields.capacity}
          hint="Registration closes automatically when this is reached."
        >
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            className="input"
            required
            defaultValue={event?.capacity ?? 100}
          />
        </Field>

        <Field
          label="Status"
          htmlFor="status"
          error={fields.status}
          hint="Only published events are visible to students."
        >
          <select
            id="status"
            name="status"
            className="select"
            defaultValue={event?.status ?? "DRAFT"}
          >
            {EVENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create event"}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </button>
        {isEdit ? (
          <button
            className="btn btn-danger ml-auto"
            type="button"
            onClick={onDelete}
            disabled={pending}
          >
            Delete event
          </button>
        ) : null}
      </div>
    </form>
  );
}
