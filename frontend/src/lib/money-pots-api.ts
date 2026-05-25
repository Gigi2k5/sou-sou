import { api } from "./api";
import type {
  MoneyPotContribution,
  MoneyPotDetail,
  MoneyPotSummary,
} from "@/types/money-pot";

export interface CreateMoneyPotInput {
  name: string;
  description?: string;
  targetAmount: number;
  deadline?: string; // ISO 8601
  isGroup?: boolean;
}

export interface UpdateMoneyPotInput {
  name?: string;
  description?: string;
  targetAmount?: number;
  deadline?: string;
}

export async function listMyMoneyPots(): Promise<MoneyPotSummary[]> {
  const { data } = await api.get<MoneyPotSummary[]>("/money-pots/me");
  return data;
}

export async function getMoneyPotDetail(id: string): Promise<MoneyPotDetail> {
  const { data } = await api.get<MoneyPotDetail>(`/money-pots/${id}`);
  return data;
}

export async function createMoneyPot(
  input: CreateMoneyPotInput,
): Promise<MoneyPotSummary> {
  const { data } = await api.post<MoneyPotSummary>("/money-pots", input);
  return data;
}

export async function updateMoneyPot(
  id: string,
  input: UpdateMoneyPotInput,
): Promise<MoneyPotSummary> {
  const { data } = await api.patch<MoneyPotSummary>(`/money-pots/${id}`, input);
  return data;
}

export async function deleteMoneyPot(id: string): Promise<void> {
  await api.delete(`/money-pots/${id}`);
}

export async function joinMoneyPot(
  inviteCode: string,
): Promise<MoneyPotSummary> {
  const { data } = await api.post<MoneyPotSummary>("/money-pots/join", {
    inviteCode,
  });
  return data;
}

export async function leaveMoneyPot(id: string): Promise<void> {
  await api.delete(`/money-pots/${id}/leave`);
}

export async function listMoneyPotContributions(
  id: string,
): Promise<MoneyPotContribution[]> {
  const { data } = await api.get<MoneyPotContribution[]>(
    `/money-pots/${id}/contributions`,
  );
  return data;
}
