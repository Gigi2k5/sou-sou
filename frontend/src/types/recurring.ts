import type { TxType } from "./tracker";

export interface RecurringTransaction {
  id: string;
  type: TxType;
  amount: number;
  dayOfMonth: number;
  note: string | null;
  userId: string;
  incomeSourceId: string | null;
  expenseCategoryId: string | null;
  incomeSource: { id: string; name: string } | null;
  expenseCategory: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
