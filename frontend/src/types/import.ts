export type ImportDirection = "income" | "expense";

/**
 * Ce que mesure un contrôle. `gross` = toutes lignes confondues : c'est le cas
 * dominant, un carnet écrivant « Total = 32000 » sans distinguer les sens.
 * Cette référence-là ne bouge pas quand l'utilisateur reclasse une ligne.
 */
export type ImportMeasure = ImportDirection | "gross";

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
 * `scope: "day"` porte un libellé au format ISO (`2026-08-01`) ; `"week"` porte
 * en plus ses bornes, ce qui permet de le recalculer après correction.
 */
export interface ImportCheckpoint {
  scope: "period" | "week" | "day";
  /** Date ISO pour un jour, libellé lisible pour une semaine ou la période. */
  label: string;
  direction: ImportMeasure;
  declared: number;
  computed: number;
  ok: boolean;
  /** Bornes ISO — présentes sur les semaines, pour recalculer après correction. */
  from?: string;
  to?: string;
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
