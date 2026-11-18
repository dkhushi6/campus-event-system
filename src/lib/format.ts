/** Display helpers shared by server and client components. */

const dateTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateOnly = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

export function formatDateTime(value: Date | string) {
  return dateTime.format(new Date(value));
}

export function formatDate(value: Date | string) {
  return dateOnly.format(new Date(value));
}

/** Formats an event's start/end as a single readable range. */
export function formatRange(start: Date | string, end: Date | string) {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const time = new Intl.DateTimeFormat("en-IN", { timeStyle: "short" });
  return sameDay
    ? `${dateOnly.format(s)}, ${time.format(s)} – ${time.format(e)}`
    : `${dateTime.format(s)} – ${dateTime.format(e)}`;
}

/** Converts a Date to the value format expected by <input type="datetime-local">. */
export function toDateTimeLocal(value: Date | string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function relativeTime(value: Date | string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return dateOnly.format(new Date(value));
}
