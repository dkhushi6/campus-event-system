import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { fieldErrors, loginSchema } from "@/lib/validation";
import type { Role } from "@/lib/constants";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", 422, {
      fields: fieldErrors(parsed.error),
    });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Same message for unknown email and wrong password — do not leak which
  // accounts exist.
  if (!user || !(await verifyPassword(password, user.password))) {
    return fail("Incorrect email or password.", 401);
  }
  if (!user.active) {
    return fail("This account has been deactivated by an administrator.", 403);
  }

  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  };
  await createSession(session);

  return ok({ user: session });
}
