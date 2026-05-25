import { api } from "./api";
import type {
  ExpenseCategory,
  IncomeSource,
  Transaction,
  TransactionsList,
  TransactionsSummary,
  TxType,
} from "@/types/tracker";

// --- Income sources ---------------------------------------------------------
export async function listIncomeSources(): Promise<IncomeSource[]> {
  const { data } = await api.get<IncomeSource[]>("/income-sources");
  return data;
}

export async function createIncomeSource(name: string): Promise<IncomeSource> {
  const { data } = await api.post<IncomeSource>("/income-sources", { name });
  return data;
}

export async function updateIncomeSource(
  id: string,
  name: string,
): Promise<IncomeSource> {
  const { data } = await api.patch<IncomeSource>(`/income-sources/${id}`, {
    name,
  });
  return data;
}

export async function deleteIncomeSource(id: string): Promise<void> {
  await api.delete(`/income-sources/${id}`);
}

// --- Expense categories -----------------------------------------------------
export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await api.get<ExpenseCategory[]>("/expense-categories");
  return data;
}

export async function createExpenseCategory(
  name: string,
): Promise<ExpenseCategory> {
  const { data } = await api.post<ExpenseCategory>("/expense-categories", {
    name,
  });
  return data;
}

export async function updateExpenseCategory(
  id: string,
  name: string,
): Promise<ExpenseCategory> {
  const { data } = await api.patch<ExpenseCategory>(
    `/expense-categories/${id}`,
    { name },
  );
  return data;
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  await api.delete(`/expense-categories/${id}`);
}

// --- Transactions -----------------------------------------------------------
export interface ListTxQuery {
  type?: TxType;
  from?: Date | null;
  to?: Date | null;
  page?: number;
  limit?: number;
}

export async function listTransactions(
  q: ListTxQuery = {},
): Promise<TransactionsList> {
  const { data } = await api.get<TransactionsList>("/transactions", {
    params: {
      ...(q.type ? { type: q.type } : {}),
      ...(q.from ? { from: q.from.toISOString() } : {}),
      ...(q.to ? { to: q.to.toISOString() } : {}),
      ...(q.page ? { page: q.page } : {}),
      ...(q.limit ? { limit: q.limit } : {}),
    },
  });
  return data;
}

export interface CreateTxInput {
  type: TxType;
  amount: number;
  date: Date;
  note?: string;
  incomeSourceId?: string;
  expenseCategoryId?: string;
}

export async function createTransaction(
  input: CreateTxInput,
): Promise<Transaction> {
  const { data } = await api.post<Transaction>("/transactions", {
    ...input,
    date: input.date.toISOString(),
  });
  return data;
}

export interface UpdateTxInput {
  amount?: number;
  date?: Date;
  note?: string;
  incomeSourceId?: string;
  expenseCategoryId?: string;
}

export async function updateTransaction(
  id: string,
  input: UpdateTxInput,
): Promise<Transaction> {
  const payload: Record<string, unknown> = { ...input };
  if (input.date) payload.date = input.date.toISOString();
  const { data } = await api.patch<Transaction>(`/transactions/${id}`, payload);
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/transactions/${id}`);
}

export async function getSummary(
  from?: Date | null,
  to?: Date | null,
): Promise<TransactionsSummary> {
  const { data } = await api.get<TransactionsSummary>(
    "/transactions/summary",
    {
      params: {
        ...(from ? { from: from.toISOString() } : {}),
        ...(to ? { to: to.toISOString() } : {}),
      },
    },
  );
  return data;
}
