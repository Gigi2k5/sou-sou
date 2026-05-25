import { api } from "./api";
import type {
  AdminReportDetail,
  AdminReportListItem,
  AdminReportsList,
  ListAdminReportsQuery,
  ResolveReportInput,
} from "@/types/admin-reports";

export async function listAdminReports(
  q: ListAdminReportsQuery = {},
): Promise<AdminReportsList> {
  const { data } = await api.get<AdminReportsList>("/admin/reports", {
    params: {
      ...(q.page ? { page: q.page } : {}),
      ...(q.limit ? { limit: q.limit } : {}),
      ...(q.tab ? { tab: q.tab } : {}),
      ...(q.targetType ? { targetType: q.targetType } : {}),
      ...(q.reason ? { reason: q.reason } : {}),
      ...(q.status ? { status: q.status } : {}),
    },
  });
  return data;
}

export async function getAdminReportDetail(
  id: string,
): Promise<AdminReportDetail> {
  const { data } = await api.get<AdminReportDetail>(`/admin/reports/${id}`);
  return data;
}

export async function resolveAdminReport(
  id: string,
  input: ResolveReportInput,
): Promise<AdminReportListItem> {
  const { data } = await api.patch<AdminReportListItem>(
    `/admin/reports/${id}`,
    input,
  );
  return data;
}
