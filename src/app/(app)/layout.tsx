import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Nav } from "@/components/nav";

/**
 * Shell for every signed-in page. Centralising the session check here means no
 * page inside this group can render for an anonymous or deactivated user.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <div className="min-h-screen">
      <Nav user={{ name: user.name, role: user.role }} unreadCount={unreadCount} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
