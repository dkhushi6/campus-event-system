import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { fieldErrors, signupSchema } from "@/lib/validation";
import { notifyUser } from "@/lib/notifications";

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", 422, {
      fields: fieldErrors(parsed.error),
    });
  }

  const { name, email, password, role, enrollmentNo, department } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return fail("An account with this email already exists.", 409, {
      fields: { email: "This email is already registered." },
    });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      role,
      enrollmentNo: enrollmentNo || null,
      department: department || null,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  await createSession({ ...user, role: user.role as typeof role });

  await notifyUser({
    userId: user.id,
    email: user.email,
    type: "SYSTEM",
    title: "Welcome to the Campus Event Management System",
    body: `Your ${role.toLowerCase()} account is ready. Browse published events to get started.`,
  });

  return ok({ user }, 201);
}
