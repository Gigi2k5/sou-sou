import { api } from "./api";
import type { RecurringTransaction } from "@/types/recurring";
import type { TxType } from "@/types/tracker";

export interface CreateRecurringInput {
  type: TxType;
  amount: number;
  dayOfMonth: number;
  note?: string;
  incomeSourceId?: string;
  expenseCategoryId?: string;
}

export interface UpdateRecurringInput {
  amount?: number;
  dayOfMonth?: number;
  note?: string;
  incomeSourceId?: string | null;
  expenseCategoryId?: string | null;
  isActive?: boolean;
}

export async function listRecurringTransactions(): Promise<
  RecurringTransaction[]
> {
  const { data } = await api.get<RecurringTransaction[]>(
    "/recurring-transactions",
  );
  return data;
}

export async function createRecurringTransaction(
  input: CreateRecurringInput,
): Promise<RecurringTransaction> {
  const { data } = await api.post<RecurringTransaction>(
    "/recurring-transactions",
    input,
  );
  return data;
}

export async function updateRecurringTransaction(
  id: string,
  input: UpdateRecurringInput,
): Promise<RecurringTransaction> {
  const { data } = await api.patch<RecurringTransaction>(
    `/recurring-transactions/${id}`,
    input,
  );
  return data;
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  await api.delete(`/recurring-transactions/${id}`);
}
