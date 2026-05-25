export type ReportTarget = "ARTICLE" | "COMMENT" | "USER";
export type ReportReason =
  | "SPAM"
  | "INAPPROPRIATE"
  | "MISINFORMATION"
  | "HARASSMENT"
  | "OTHER";
export type ReportStatus = "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED";

export interface CreateReportInput {
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  description?: string;
}

export interface Report {
  id: string;
  reporterId: string | null;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  adminNote: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
}
