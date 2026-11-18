import { prisma } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { eventSchema, fieldErrors } from "@/lib/validation";
import { EVENT_CATEGORIES, EVENT_STATUSES } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/events — Events module: list with search + filters.
 *
 * Students and anonymous visitors only ever see PUBLISHED events. Organizers
 * may additionally request their own drafts with `?mine=1`; admins see all.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const category = url.searchParams.get("category") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const mine = url.searchParams.get("mine") === "1";
  const upcomingOnly = url.searchParams.get("upcoming") === "1";

  const user = await getCurrentUser();
  const where: Prisma.EventWhereInput = {};

  if (mine) {
    if (!user) return fail("You must be signed in.", 401);
    where.organizerId = user.id;
  }

  const canSeeUnpublished = user?.role === "ADMIN" || mine;
  if (canSeeUnpublished) {
    if (status && EVENT_STATUSES.includes(status as never)) where.status = status;
  } else {
    where.status = "PUBLISHED";
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { venue: { contains: q } },
    ];
  }

  if (category && EVENT_CATEGORIES.includes(category as never)) {
    where.category = category;
  }

  if (upcomingOnly) {
    where.endsAt = { gte: new Date() };
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { startsAt: "asc" },
    include: {
      organizer: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
  });

  return ok({ events });
}

/** POST /api/events — organizers and admins create events. */
export async function POST(request: Request) {
  const guard = await requireUser(["ORGANIZER", "ADMIN"]);
  if ("response" in guard) return guard.response;

  const parsed = eventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", 422, {
      fields: fieldErrors(parsed.error),
    });
  }

  const event = await prisma.event.create({
    data: { ...parsed.data, organizerId: guard.user.id },
  });

  return ok({ event }, 201);
}
