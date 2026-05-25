import { api } from "./api";
import type { AdminOverviewStats } from "@/types/admin";

export async function getAdminOverview(): Promise<AdminOverviewStats> {
  const { data } = await api.get<AdminOverviewStats>("/admin/stats/overview");
  return data;
}
