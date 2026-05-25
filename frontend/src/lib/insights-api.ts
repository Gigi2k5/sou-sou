import { api } from "./api";
import type { InsightsPeriod, InsightsResponse } from "@/types/insights";

export async function getInsights(
  period: InsightsPeriod,
): Promise<InsightsResponse> {
  const { data } = await api.get<InsightsResponse>("/insights", {
    params: { period },
  });
  return data;
}
