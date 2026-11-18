import { prisma } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/api";
import { fieldErrors, userUpdateSchema } from "@/lib/validation";
import { notifyUser } from "@/lib/notifications";
import { ROLE_LABELS } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/users/:id — change a user's role or activation state. */
export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireUser(["ADMIN"]);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const parsed = userUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid update.", 422, { fields: fieldErrors(parsed.error) });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return fail("User not found.", 404);

  // Guard against an admin locking themselves out of the system.
  if (target.id === guard.user.id) {
    if (parsed.data.active === false) {
      return fail("You cannot deactivate your own account.", 409);
    }
    if (parsed.data.role && parsed.data.role !== "ADMIN") {
      return fail("You cannot remove your own administrator role.", 409);
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  if (parsed.data.role && parsed.data.role !== target.role) {
    await notifyUser({
      userId: user.id,
      email: user.email,
      type: "SYSTEM",
      title: "Your account role changed",
      body: `An administrator set your role to ${ROLE_LABELS[parsed.data.role]}.`,
    });
  }

  return ok({ user });
}
