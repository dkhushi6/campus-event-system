import crypto from "node:crypto";
import QRCode from "qrcode";

/**
 * QR ticket helpers.
 *
 * A ticket QR carries the registration's ticket code plus an HMAC signature
 * derived from AUTH_SECRET. Check-in therefore rejects two separate classes of
 * invalid ticket:
 *
 *   1. tampered / hand-crafted codes  -> signature mismatch
 *   2. codes that are not in the DB   -> lookup failure
 */

const TICKET_PREFIX = "CES";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set. See .env.example.");
  return value;
}

/** Generates a human-readable, collision-resistant ticket code. */
export function generateTicketCode() {
  // 8 bytes -> 16 hex chars, grouped for readability: CES-A1B2C3D4-E5F6A7B8
  const raw = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `${TICKET_PREFIX}-${raw.slice(0, 8)}-${raw.slice(8)}`;
}

export function signTicket(ticketCode: string) {
  return crypto
    .createHmac("sha256", secret())
    .update(ticketCode)
    .digest("hex")
    .slice(0, 16);
}

export type TicketPayload = {
  v: 1;
  ticket: string;
  sig: string;
};

/** Serialises the payload that gets encoded into the QR image. */
export function buildTicketPayload(ticketCode: string): string {
  const payload: TicketPayload = {
    v: 1,
    ticket: ticketCode,
    sig: signTicket(ticketCode),
  };
  return JSON.stringify(payload);
}

export type ParsedTicket =
  | { ok: true; ticketCode: string }
  | { ok: false; reason: string };

/**
 * Parses and cryptographically verifies scanner input.
 *
 * Accepts either the full JSON payload produced by `buildTicketPayload` or a
 * bare ticket code (so a code can also be typed in manually when a camera is
 * unavailable — the DB lookup still has to succeed).
 */
export function parseAndVerifyTicket(input: string): ParsedTicket {
  const text = input.trim();
  if (!text) return { ok: false, reason: "Empty scan result." };

  // Bare ticket code — no signature to check, validity comes from the lookup.
  if (/^CES-[0-9A-F]{8}-[0-9A-F]{8}$/i.test(text)) {
    return { ok: true, ticketCode: text.toUpperCase() };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "This QR code is not a campus event ticket." };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("ticket" in parsed) ||
    !("sig" in parsed)
  ) {
    return { ok: false, reason: "Ticket payload is missing required fields." };
  }

  const { ticket, sig } = parsed as { ticket: unknown; sig: unknown };
  if (typeof ticket !== "string" || typeof sig !== "string") {
    return { ok: false, reason: "Ticket payload is malformed." };
  }

  const expected = signTicket(ticket);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "Ticket signature is invalid (possible forgery)." };
  }

  return { ok: true, ticketCode: ticket };
}

/** Renders the ticket payload as a data-URL PNG for display/printing. */
export function renderTicketQr(ticketCode: string) {
  return QRCode.toDataURL(buildTicketPayload(ticketCode), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
}
