export type ImportDirection = "income" | "expense";

/** Une transaction comprise par l'analyse, avant relecture. */
export interface ImportLine {
  date: string;
  label: string;
  amount: number;
  direction: ImportDirection;
  category?: string;
  confidence?: number;
}

/**
 * Un contrôle chiffré : ce que le document ANNONCE face à ce qui a été extrait.
 * `scope: "day"` porte un libellé au format ISO (`2026-08-01`).
 */
export interface ImportCheckpoint {
  scope: "period" | "day";
  label: string;
  direction: ImportDirection;
  declared: number;
  computed: number;
  ok: boolean;
}

export interface ImportAnalysis {
  periodLabel: string | null;
  lines: ImportLine[];
  totals: {
    income: number;
    expense: number;
    declaredIncome: number | null;
    declaredExpense: number | null;
  };
  checkpoints: ImportCheckpoint[];
  checkSummary: { passed: number; total: number };
  categories: { known: string[]; toCreate: string[] };
  incomeSources: { known: string[]; toCreate: string[] };
  /** `ONLY_EXPENSES` est un code ; les autres entrées sont des phrases. */
  warnings: string[];
}

export interface CommitImportInput {
  lines: Omit<ImportLine, "confidence">[];
  periodLabel?: string;
  declaredIncomeTotal?: number;
  declaredExpenseTotal?: number;
}

export interface CommitImportResult {
  batchId: string;
  lineCount: number;
  importedIncomeTotal: number;
  importedExpenseTotal: number;
  createdCategories: number;
  createdIncomeSources: number;
}

export interface ImportBatch {
  id: string;
  source: "TEXT" | "FILE";
  periodLabel: string | null;
  lineCount: number;
  importedIncomeTotal: number;
  importedExpenseTotal: number;
  declaredIncomeTotal: number | null;
  declaredExpenseTotal: number | null;
  createdAt: string;
}

/** Ligne enrichie d'un identifiant local, pour l'édition dans l'écran de revue. */
export interface EditableLine extends ImportLine {
  /** Stable côté client uniquement — jamais envoyé au serveur. */
  uid: string;
}
