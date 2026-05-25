export interface AdminOverviewStats {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersDelta: number;
  activeUsers7d: number;
  activeUsersDelta: number;
  totalTransactions: number;
  totalContributions: number;
  totalSavingsAmount: number;
  totalArticles: number;
  pendingReports: number;
  signupsByDay: { date: string; count: number }[];
  activityByDay: {
    date: string;
    transactions: number;
    contributions: number;
  }[];
  recentArticles: {
    id: string;
    title: string;
    slug: string;
    createdAt: string;
    author: { id: string; name: string; avatarUrl: string | null };
  }[];
  recentReports: {
    id: string;
    targetType: "ARTICLE" | "COMMENT" | "USER";
    targetId: string;
    reason: "SPAM" | "INAPPROPRIATE" | "MISINFORMATION" | "HARASSMENT" | "OTHER";
    status: "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED";
    createdAt: string;
    reporter: { id: string; name: string; avatarUrl: string | null } | null;
  }[];
  topActiveUsers: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    totalActions: number;
  }[];
}
