/**
 * Shared domain constants.
 *
 * SQLite has no native enum type, so these string unions are the single source
 * of truth for every status/role column in prisma/schema.prisma.
 */

export const ROLES = ["STUDENT", "ORGANIZER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const EVENT_CATEGORIES = [
  "TECHNICAL",
  "CULTURAL",
  "SPORTS",
  "WORKSHOP",
  "SEMINAR",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const REGISTRATION_STATUSES = ["CONFIRMED", "CANCELLED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const NOTIFICATION_TYPES = ["CONFIRMATION", "REMINDER", "SYSTEM"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Student",
  ORGANIZER: "Organizer",
  ADMIN: "Administrator",
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  TECHNICAL: "Technical",
  CULTURAL: "Cultural",
  SPORTS: "Sports",
  WORKSHOP: "Workshop",
  SEMINAR: "Seminar",
};
