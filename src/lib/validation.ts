import { z } from "zod";
import { EVENT_CATEGORIES, EVENT_STATUSES, ROLES } from "@/lib/constants";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(ROLES).default("STUDENT"),
  enrollmentNo: z.string().trim().max(32).optional().or(z.literal("")),
  department: z.string().trim().max(64).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(140),
    description: z.string().trim().min(10, "Description must be at least 10 characters."),
    category: z.enum(EVENT_CATEGORIES),
    venue: z.string().trim().min(2, "Venue is required.").max(140),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least 1.").max(100000),
    status: z.enum(EVENT_STATUSES).default("DRAFT"),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: "End time must be after the start time.",
    path: ["endsAt"],
  });

export const checkinSchema = z.object({
  payload: z.string().min(1, "Scan payload is required."),
  eventId: z.string().min(1).optional(),
});

export const userUpdateSchema = z.object({
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});

/** Flattens a ZodError into `{ field: message }` for form display. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
