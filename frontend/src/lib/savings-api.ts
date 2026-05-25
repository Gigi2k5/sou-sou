import { api } from "./api";
import type {
  GamificationStats,
  SavingsContribution,
  SavingsGoal,
  UserBadgeFront,
} from "@/types/savings";

// --- Savings goal -----------------------------------------------------------
export async function getGoal(): Promise<SavingsGoal | null> {
  const { data } = await api.get<SavingsGoal | null>("/savings-goal");
  return data;
}

export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  dailyAmount: number;
  deadline: Date;
}
export async function createGoal(input: CreateGoalInput): Promise<SavingsGoal> {
  const { data } = await api.post<SavingsGoal>("/savings-goal", {
    ...input,
    deadline: input.deadline.toISOString(),
  });
  return data;
}

export interface UpdateGoalInput {
  name?: string;
  targetAmount?: number;
  dailyAmount?: number;
  deadline?: Date;
}
export async function updateGoal(input: UpdateGoalInput): Promise<SavingsGoal> {
  const payload: Record<string, unknown> = { ...input };
  if (input.deadline) payload.deadline = input.deadline.toISOString();
  const { data } = await api.patch<SavingsGoal>("/savings-goal", payload);
  return data;
}

export async function deleteGoal(): Promise<void> {
  await api.delete("/savings-goal");
}

// --- Contributions (Transactions liées à la catégorie SAVINGS) -------------
//
// La création/suppression de contributions passe désormais par les endpoints
// /transactions (cf. lib/tracker-api.ts). Cette fonction sert juste à lister
// l'historique pour l'affichage "Mes contributions" sur la page épargne.

export async function listContributions(): Promise<SavingsContribution[]> {
  const { data } = await api.get<SavingsContribution[]>(
    "/savings-goal/contributions",
  );
  return data;
}

// --- Gamification -----------------------------------------------------------
export async function getStats(): Promise<GamificationStats> {
  const { data } = await api.get<GamificationStats>("/gamification/me");
  return data;
}

export async function listBadges(): Promise<UserBadgeFront[]> {
  const { data } = await api.get<UserBadgeFront[]>("/gamification/badges");
  return data;
}
