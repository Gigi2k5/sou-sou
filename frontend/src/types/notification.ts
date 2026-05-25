export type NotifType =
  | "CONTRIBUTION_REMINDER"
  | "STREAK_AT_RISK"
  | "BADGE_UNLOCKED"
  | "GOAL_COMPLETED"
  | "AVATAR_UNLOCKED"
  | "CONTRIBUTION_GOAL_PROGRESS"
  | "CONTRIBUTION_GOAL_COMPLETED"
  | "CONTRIBUTION_NEW_MEMBER"
  | "CONTRIBUTION_PAYMENT_RECEIVED"
  // Admin (V3)
  | "ADMIN_WARNING"
  | "ADMIN_HIDE_NOTICE"
  | "ADMIN_DELETE_NOTICE"
  | "ADMIN_BROADCAST"
  // Budgets (V4)
  | "BUDGET_WARNING"
  | "BUDGET_EXCEEDED"
  // Likes & comments (V4)
  | "ARTICLE_LIKED"
  | "ARTICLE_COMMENTED";

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsPage {
  items: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  pageCount: number;
}
