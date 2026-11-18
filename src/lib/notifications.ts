import { prisma } from "@/lib/db";
import type { NotificationType } from "@/lib/constants";

/**
 * Alerts module.
 *
 * Every alert is persisted so it shows up in the in-app notification feed, and
 * is additionally handed to `deliverEmail`. The email transport is a logging
 * stub by default: the project runs with no external mail account, and the log
 * line is enough to demonstrate the integration point. Swap the body of
 * `deliverEmail` for nodemailer/Resend to send real mail.
 */

type NotifyInput = {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  email?: string | null;
};

async function deliverEmail(to: string, title: string, body: string) {
  console.info(`[alerts] email -> ${to}\n  subject: ${title}\n  body: ${body}`);
}

export async function notifyUser({
  userId,
  title,
  body,
  type = "SYSTEM",
  email,
}: NotifyInput) {
  const notification = await prisma.notification.create({
    data: { userId, title, body, type },
  });

  if (email) {
    await deliverEmail(email, title, body);
  }

  return notification;
}

/** Sends the same alert to many users — used for event-wide reminders. */
export async function notifyMany(
  recipients: { userId: string; email?: string | null }[],
  title: string,
  body: string,
  type: NotificationType = "SYSTEM",
) {
  if (recipients.length === 0) return 0;

  await prisma.notification.createMany({
    data: recipients.map((r) => ({ userId: r.userId, title, body, type })),
  });

  await Promise.all(
    recipients
      .filter((r) => r.email)
      .map((r) => deliverEmail(r.email as string, title, body)),
  );

  return recipients.length;
}
