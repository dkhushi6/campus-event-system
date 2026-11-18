import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/format";
import { MarkAllReadButton } from "@/components/mark-read-button";
import { Badge, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Alerts · Campus Events" };

const TONES = {
  CONFIRMATION: "success",
  REMINDER: "primary",
  SYSTEM: "neutral",
} as const;

/** Alerts module — in-app notification feed. */
export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Registration confirmations, event reminders and system messages."
        action={<MarkAllReadButton disabled={unread === 0} />}
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="No alerts yet"
          description="Register for an event and your confirmation will appear here."
        />
      ) : (
        <div className="card divide-y">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`p-5 ${notification.readAt ? "" : "bg-primary-soft/30"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    TONES[notification.type as keyof typeof TONES] ?? "neutral"
                  }
                >
                  {notification.type.toLowerCase()}
                </Badge>
                {!notification.readAt ? <Badge tone="primary">unread</Badge> : null}
                <span
                  className="ml-auto text-xs text-muted"
                  title={formatDateTime(notification.createdAt)}
                >
                  {relativeTime(notification.createdAt)}
                </span>
              </div>
              <h2 className="mt-2 font-semibold">{notification.title}</h2>
              <p className="mt-1 text-sm text-muted">{notification.body}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
