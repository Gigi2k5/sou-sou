import type { ReportReason, ReportStatus } from "./reports";

export type AdminArticleTab = "all" | "reported" | "hidden";

export interface AdminArticleAuthor {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isBanned: boolean;
}

export interface AdminArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  isHidden: boolean;
  hiddenAt: string | null;
  hiddenBy: string | null;
  hiddenReason: string | null;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  author: AdminArticleAuthor;
}

export interface AdminArticleReport {
  id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface AdminArticleDetail extends AdminArticleListItem {
  content: string;
  reports: AdminArticleReport[];
}

export interface AdminArticlesList {
  items: AdminArticleListItem[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface ListAdminArticlesQuery {
  page?: number;
  limit?: number;
  search?: string;
  tab?: AdminArticleTab;
}
