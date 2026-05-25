export type AdminUserStatus = "active" | "inactive" | "banned";
export type AdminUserRole = "USER" | "ADMIN";

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: AdminUserRole;
  currency: string;
  totalPoints: number;
  isBanned: boolean;
  bannedAt: string | null;
  banReason: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  status: AdminUserStatus;
}

export interface AdminUsersList {
  items: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface AdminUserDetailStats {
  totalTransactions: number;
  totalContributions: number;
  totalSavings: number;
  totalArticles: number;
  badgesUnlocked: number;
  avatarsUnlocked: number;
  currentStreak: number;
  bestStreak: number;
  ownedMoneyPotsCount: number;
  moneyPotMembershipsCount: number;
}

export type AdminUserActivityType =
  | "TRANSACTION_INCOME"
  | "TRANSACTION_EXPENSE"
  | "ARTICLE"
  | "AVATAR_UNLOCK"
  | "BADGE_UNLOCK"
  | "POT_CREATED"
  | "POT_JOINED";

export interface AdminUserActivityEntry {
  type: AdminUserActivityType;
  date: string;
  label: string;
}

export interface AdminUserDetail {
  user: AdminUserListItem;
  stats: AdminUserDetailStats;
  recentActivity: AdminUserActivityEntry[];
}

export interface ListAdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdminUserStatus;
  currency?: string;
  sortBy?: "createdAt" | "lastLoginAt" | "totalPoints" | "name";
  order?: "asc" | "desc";
}
