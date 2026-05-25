import { api } from "./api";
import type { RecapPeriod, RecapResult } from "@/types/recap";

export async function getRecap(period: RecapPeriod): Promise<RecapResult> {
  const { data } = await api.get<RecapResult>("/recap", {
    params: { period },
  });
  return data;
}
