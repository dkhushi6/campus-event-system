import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { UserRowActions } from "@/components/user-row-actions";
import { Badge, PageHeader, StatCard } from "@/components/ui";

export const metadata = { title: "Users · Campus Events" };

type SearchParams = Promise<{ q?: string }>;

/** Administration module — user directory and role management. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const current = await getCurrentUser();
  if (!current) return null;
  if (current.role !== "ADMIN") redirect("/dashboard");

  const { q = "" } = await searchParams;

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { enrollmentNo: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { registrations: true, organizedEvents: true } },
    },
  });

  const counts = {
    students: users.filter((u) => u.role === "STUDENT").length,
    organizers: users.filter((u) => u.role === "ORGANIZER").length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    inactive: users.filter((u) => !u.active).length,
  };

  return (
    <>
      <PageHeader
        title="User management"
        description="Change a user's role or deactivate an account. Deactivated users cannot sign in."
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={counts.students} />
        <StatCard label="Organizers" value={counts.organizers} />
        <StatCard label="Administrators" value={counts.admins} />
        <StatCard label="Deactivated" value={counts.inactive} />
      </section>

      <form className="card mb-5 flex gap-2 p-4" action="/admin/users">
        <input
          className="input"
          name="q"
          defaultValue={q}
          placeholder="Search by name, email or enrollment number…"
          aria-label="Search users"
        />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Department</th>
              <th className="text-right">Activity</th>
              <th>Joined</th>
              <th>Manage</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted">
                  No users match “{q}”.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {!user.active ? <Badge tone="danger">inactive</Badge> : null}
                      {user.id === current.id ? <Badge tone="primary">you</Badge> : null}
                    </div>
                    <p className="text-xs text-muted">{user.email}</p>
                    {user.enrollmentNo ? (
                      <p className="text-xs text-muted">{user.enrollmentNo}</p>
                    ) : null}
                  </td>
                  <td className="text-xs font-medium">
                    {ROLE_LABELS[user.role as Role]}
                  </td>
                  <td className="text-xs">{user.department ?? "—"}</td>
                  <td className="text-right text-xs tabular-nums">
                    {user._count.registrations} reg.
                    <br />
                    {user._count.organizedEvents} events
                  </td>
                  <td className="text-xs">{formatDate(user.createdAt)}</td>
                  <td>
                    <UserRowActions
                      userId={user.id}
                      role={user.role as Role}
                      active={user.active}
                      isSelf={user.id === current.id}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
