export type BroadcastSegment =
  | "ALL"
  | "ACTIVE_7D"
  | "INACTIVE_30D"
  | "NEW_USERS_7D"
  | "ADMINS";

export interface BroadcastListItem {
  id: string;
  title: string;
  body: string;
  segment: BroadcastSegment;
  recipientCount: number;
  createdAt: string;
  createdBy: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface BroadcastsList {
  items: BroadcastListItem[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface BroadcastPreview {
  segment: BroadcastSegment;
  recipientCount: number;
}

export interface CreateBroadcastInput {
  title: string;
  body: string;
  segment: BroadcastSegment;
}
