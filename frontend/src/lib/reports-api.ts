import { api } from "./api";
import type { CreateReportInput, Report } from "@/types/reports";

export async function createReport(input: CreateReportInput): Promise<Report> {
  const { data } = await api.post<Report>("/reports", input);
  return data;
}
