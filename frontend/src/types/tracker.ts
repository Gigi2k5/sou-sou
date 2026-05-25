export type TxType = "INCOME" | "EXPENSE";

export interface IncomeSource {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export type ExpenseCategoryKind = "FREE" | "SAVINGS" | "POT";

export interface ExpenseCategory {
  id: string;
  name: string;
  /** FREE = créée par l'user, SAVINGS = liée à un objectif d'épargne, POT = liée à une cotisation. */
  kind: ExpenseCategoryKind;
  /** Si true, catégorie auto-gérée par le pot/objectif — non éditable depuis l'UI catégories. */
  system: boolean;
  /** Présent si kind === 'POT'. */
  moneyPotId: string | null;
  /** Présent si kind === 'SAVINGS'. */
  savingsGoalId: string | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  date: string;
  note: string | null;
  userId: string;
  incomeSourceId: string | null;
  expenseCategoryId: string | null;
  incomeSource: { id: string; name: string } | null;
  expenseCategory: { id: string; name: string } | null;
  /** Set si cette transaction a été générée par une récurrence. */
  recurringTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsList {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface SummaryBucket {
  id: string | null;
  name: string;
  total: number;
}

export interface TransactionsSummary {
  range: { from: string | null; to: string | null };
  income: { total: number; bySource: SummaryBucket[] };
  expense: { total: number; byCategory: SummaryBucket[] };
  balance: number;
}
