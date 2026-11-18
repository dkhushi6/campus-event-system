"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { Alert, Badge } from "@/components/ui";

const READER_ID = "qr-reader";

type ScanOutcome = {
  result: "CHECKED_IN" | "DUPLICATE" | "INVALID" | "CANCELLED" | "WRONG_EVENT";
  message: string;
  attendee?: { name: string; email: string; enrollmentNo?: string | null };
  event?: { title: string };
  checkedInAt?: string;
  at: number;
};

const TONES = {
  CHECKED_IN: "success",
  DUPLICATE: "warning",
  WRONG_EVENT: "warning",
  CANCELLED: "danger",
  INVALID: "danger",
} as const;

const HEADINGS = {
  CHECKED_IN: "Attendance recorded",
  DUPLICATE: "Already checked in",
  WRONG_EVENT: "Wrong event",
  CANCELLED: "Entry denied",
  INVALID: "Invalid ticket",
} as const;

/**
 * QR check-in module — scanner screen.
 *
 * The camera feed never decides anything on its own: every decoded payload is
 * posted to /api/checkin, which performs signature, lookup, ownership and
 * duplicate validation before any attendance row is written.
 */
export function QrScanner({
  eventId,
  eventTitle,
}: {
  eventId?: string;
  eventTitle?: string;
}) {
  const router = useRouter();

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ScanOutcome[]>([]);

  // Suppresses the repeated decodes html5-qrcode emits while a code stays in
  // frame, so one physical ticket produces one API call.
  const lastPayload = useRef<{ value: string; at: number } | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(
    null,
  );

  const submitPayload = useCallback(
    async (payload: string) => {
      setBusy(true);
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload, eventId }),
      });
      const data = await response.json().catch(() => ({}));
      setBusy(false);

      const outcome: ScanOutcome = {
        result: (data.result as ScanOutcome["result"]) ?? "INVALID",
        message: response.ok
          ? "Entry approved — attendance saved."
          : (data.error ?? "Could not validate this ticket."),
        attendee: data.attendee,
        event: data.event,
        checkedInAt: data.checkedInAt,
        at: Date.now(),
      };

      setHistory((previous) => [outcome, ...previous].slice(0, 25));

      if (response.ok) router.refresh();
    },
    [eventId, router],
  );

  const handleDecoded = useCallback(
    (decoded: string) => {
      const previous = lastPayload.current;
      // Ignore the same code for 3s after it is handled.
      if (previous && previous.value === decoded && Date.now() - previous.at < 3000) {
        return;
      }
      lastPayload.current = { value: decoded, at: Date.now() };
      void submitPayload(decoded);
    },
    [submitPayload],
  );

  // Start/stop the camera. html5-qrcode touches browser-only APIs, so it is
  // imported lazily inside the effect rather than at module scope.
  useEffect(() => {
    if (!cameraOn) return;

    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(READER_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => handleDecoded(decodedText),
          () => {
            // Per-frame decode misses are normal; nothing to report.
          },
        );
      } catch (error) {
        if (cancelled) return;
        setCameraOn(false);
        setCameraError(
          error instanceof Error
            ? `Camera unavailable: ${error.message}. Use manual entry below.`
            : "Camera unavailable. Use manual entry below.",
        );
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {
            /* already stopped */
          });
      }
    };
  }, [cameraOn, handleDecoded]);

  async function onManualSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setManualCode("");
    await submitPayload(code);
  }

  const latest = history[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="grid h-fit gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Camera scanner</h2>
            <button
              className={cameraOn ? "btn btn-secondary" : "btn btn-primary"}
              onClick={() => {
                setCameraError(null);
                setCameraOn((on) => !on);
              }}
            >
              {cameraOn ? "Stop camera" : "Start camera"}
            </button>
          </div>

          <p className="mt-1 text-sm text-muted">
            {eventTitle
              ? `Scanning tickets for “${eventTitle}”.`
              : "Scanning tickets for all events you manage."}
          </p>

          <div
            id={READER_ID}
            className="mt-4 grid min-h-56 place-items-center overflow-hidden rounded-lg bg-surface-muted text-center text-sm text-muted"
          >
            {!cameraOn ? (
              <span className="px-6 py-10">
                Start the camera to scan a QR ticket, or type a ticket code below.
              </span>
            ) : null}
          </div>

          {cameraError ? (
            <div className="mt-3">
              <Alert tone="warning">{cameraError}</Alert>
            </div>
          ) : null}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Manual entry</h2>
          <p className="mt-1 text-sm text-muted">
            Fallback when a camera is not available. The ticket still has to exist
            and pass every validation check.
          </p>
          <form className="mt-3 flex gap-2" onSubmit={onManualSubmit}>
            <input
              className="input font-mono"
              placeholder="CES-XXXXXXXX-XXXXXXXX"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              aria-label="Ticket code"
            />
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Checking…" : "Check in"}
            </button>
          </form>
        </div>
      </section>

      <section className="grid h-fit gap-4">
        <div className="card p-5">
          <h2 className="font-semibold">Last scan</h2>

          {!latest ? (
            <p className="mt-2 text-sm text-muted">No tickets scanned yet.</p>
          ) : (
            <div className="mt-3 grid gap-2">
              <Badge tone={TONES[latest.result]}>{HEADINGS[latest.result]}</Badge>
              <p className="text-sm">{latest.message}</p>

              {latest.attendee ? (
                <div className="rounded-lg bg-surface-muted p-3 text-sm">
                  <p className="font-semibold">{latest.attendee.name}</p>
                  <p className="text-xs text-muted">{latest.attendee.email}</p>
                  {latest.attendee.enrollmentNo ? (
                    <p className="text-xs text-muted">
                      Enrollment {latest.attendee.enrollmentNo}
                    </p>
                  ) : null}
                  {latest.event ? (
                    <p className="mt-1 text-xs text-muted">{latest.event.title}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Scan log</h2>
            {history.length > 0 ? (
              <button
                className="text-sm font-semibold text-primary"
                onClick={() => setHistory([])}
              >
                Clear
              </button>
            ) : null}
          </div>

          {history.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Results from this session will be listed here.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {history.map((entry) => (
                <li
                  key={entry.at}
                  className="flex items-start justify-between gap-3 border-b pb-2 text-sm last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {entry.attendee?.name ?? HEADINGS[entry.result]}
                    </p>
                    <p className="truncate text-xs text-muted">{entry.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {formatDateTime(new Date(entry.at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
