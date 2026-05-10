import { sql, ensureSchema } from "./db";

export const ADMIN_RECIPIENT = "@admin";

export type NotificationKind =
  | "support_resolved"
  | "support_reopened"
  | "new_support_request"
  | "selection_reset"
  | "rank_changed";

export type Notification = {
  id: number;
  recipient: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export async function pushNotification(input: {
  recipient: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO notifications (recipient, kind, title, body, link)
    VALUES (${input.recipient}, ${input.kind}, ${input.title}, ${input.body ?? null}, ${input.link ?? null})
  `;
}

export async function getNotifications(
  recipient: string,
  limit = 30,
): Promise<{ items: Notification[]; unread: number }> {
  await ensureSchema();
  const [items, counts] = await Promise.all([
    sql<Notification[]>`
      SELECT id, recipient, kind, title, body, link, read, created_at::text AS created_at
      FROM notifications
      WHERE recipient = ${recipient}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `,
    sql<{ unread: number }[]>`
      SELECT COUNT(*)::int AS unread
      FROM notifications
      WHERE recipient = ${recipient} AND read = FALSE
    `,
  ]);
  return { items, unread: counts[0]?.unread ?? 0 };
}

export async function markNotificationsRead(
  recipient: string,
  ids?: number[],
): Promise<void> {
  await ensureSchema();
  if (ids && ids.length) {
    await sql`
      UPDATE notifications SET read = TRUE
      WHERE recipient = ${recipient} AND id IN ${sql(ids)}
    `;
  } else {
    await sql`
      UPDATE notifications SET read = TRUE
      WHERE recipient = ${recipient} AND read = FALSE
    `;
  }
}
