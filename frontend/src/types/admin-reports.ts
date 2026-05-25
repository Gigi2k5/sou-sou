import type { ReportReason, ReportStatus, ReportTarget } from "./reports";

export type AdminReportTab =
  | "all"
  | "pending"
  | "reviewing"
  | "resolved"
  | "rejected";

export interface AdminReportListItem {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  adminNote: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface AdminReportArticleTarget {
  type: "ARTICLE";
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  isHidden: boolean;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
    isBanned: boolean;
  };
}

export interface AdminReportUserTarget {
  type: "USER";
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isBanned: boolean;
}

export interface AdminReportCommentTarget {
  type: "COMMENT";
  id: string;
  placeholder: true;
}

export type AdminReportTarget =
  | AdminReportArticleTarget
  | AdminReportUserTarget
  | AdminReportCommentTarget;

export interface AdminReportDetail extends AdminReportListItem {
  target: AdminReportTarget | null;
}

export interface AdminReportsList {
  items: AdminReportListItem[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  counts: {
    pending: number;
    reviewing: number;
    resolved: number;
    rejected: number;
    total: number;
  };
}

export interface ListAdminReportsQuery {
  page?: number;
  limit?: number;
  tab?: AdminReportTab;
  targetType?: ReportTarget;
  reason?: ReportReason;
  status?: ReportStatus;
}

export interface ResolveReportInput {
  status: ReportStatus;
  adminNote?: string;
}
