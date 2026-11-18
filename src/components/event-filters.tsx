"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORY_LABELS, EVENT_CATEGORIES } from "@/lib/constants";

/**
 * Search + filter controls for the event listing. State is kept in the URL so
 * a filtered listing can be bookmarked, shared and screenshotted.
 */
export function EventFilters({ basePath = "/events" }: { basePath?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const category = params.get("category") ?? "";
  const when = params.get("when") ?? "upcoming";

  // Debounce the text box so typing does not fire a navigation per keystroke.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      router.replace(`${basePath}?${next.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [q, params, router, basePath]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${basePath}?${next.toString()}`);
  }

  const hasFilters = q || category || when !== "upcoming";

  return (
    <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
      <input
        className="input"
        placeholder="Search by title, description or venue…"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        aria-label="Search events"
      />

      <select
        className="select sm:w-44"
        value={category}
        onChange={(event) => setParam("category", event.target.value)}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {EVENT_CATEGORIES.map((value) => (
          <option key={value} value={value}>
            {CATEGORY_LABELS[value]}
          </option>
        ))}
      </select>

      <select
        className="select sm:w-36"
        value={when}
        onChange={(event) => setParam("when", event.target.value)}
        aria-label="Filter by date"
      >
        <option value="upcoming">Upcoming</option>
        <option value="past">Past</option>
        <option value="all">All dates</option>
      </select>

      <button
        className="btn btn-secondary"
        onClick={() => {
          setQ("");
          router.replace(basePath);
        }}
        disabled={!hasFilters}
      >
        Reset
      </button>
    </div>
  );
}
