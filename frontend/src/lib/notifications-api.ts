import { api } from "./api";
import type { NotificationsPage } from "@/types/notification";

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<NotificationsPage> {
  const { data } = await api.get<NotificationsPage>("/notifications", {
    params,
  });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>(
    "/notifications/unread-count",
  );
  return data.count;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const { data } = await api.patch<{ updated: number }>(
    "/notifications/read-all",
  );
  return data.updated;
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}
