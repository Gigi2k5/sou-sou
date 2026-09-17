import { api } from "./api";
import type { InsightsPeriod, InsightsResponse } from "@/types/insights";

/**
 * `monthOffset` recule le point de référence de N mois (0 = maintenant).
 * Sans lui, aucune période ne permettait d'atteindre un historique ancien.
 */
export async function getInsights(
  period: InsightsPeriod,
  monthOffset = 0,
): Promise<InsightsResponse> {
  const { data } = await api.get<InsightsResponse>("/insights", {
    params: { period, ...(monthOffset !== 0 ? { monthOffset } : {}) },
  });
  return data;
}
