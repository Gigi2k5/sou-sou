/**
 * Contrat interne de l'import d'historique.
 *
 * Ces types décrivent ce que le modèle de langage RENVOIE, pas ce qu'on écrit
 * en base. Rien ici n'est digne de confiance tant que `import.service` ne l'a
 * pas validé : le LLM produit de la donnée, jamais des instructions.
 */

export type Direction = 'income' | 'expense';

/** Une transaction telle que comprise par le modèle, avant validation. */
export interface ExtractedLine {
  /** ISO `YYYY-MM-DD`. */
  date: string;
  label: string;
  amount: number;
  direction: Direction;
  /** Nom de catégorie (dépense) ou de source (revenu). Peut être absent. */
  category?: string;
  /** 0 → 1. Sert à trier l'écran de revue, les plus douteuses en premier. */
  confidence?: number;
}

/** Totaux lus DANS le document source, quand il en contient. */
export interface DeclaredTotals {
  income?: number;
  expense?: number;
}

export interface DeclaredDailyTotal {
  date: string;
  income?: number;
  expense?: number;
}

/** Réponse brute du modèle. */
export interface ExtractionResult {
  periodLabel?: string;
  onlyExpenses?: boolean;
  declaredPeriodTotals?: DeclaredTotals;
  declaredDailyTotals?: DeclaredDailyTotal[];
  lines: ExtractedLine[];
}

/**
 * Une vérification chiffrée : ce que le document ANNONCE face à ce qu'on a
 * effectivement extrait.
 *
 * C'est la pièce maîtresse de la fiabilité. Un écart ne bloque pas l'import —
 * il remonte à l'utilisateur, qui tranche. Mieux vaut un avertissement honnête
 * qu'un import silencieusement faux.
 */
export interface Checkpoint {
  scope: 'period' | 'day';
  label: string;
  direction: Direction;
  declared: number;
  computed: number;
  ok: boolean;
}

export interface AnalysisReport {
  periodLabel: string | null;
  lines: ExtractedLine[];
  totals: {
    income: number;
    expense: number;
    declaredIncome: number | null;
    declaredExpense: number | null;
  };
  checkpoints: Checkpoint[];
  /** Résumé lisible : combien de contrôles passent. */
  checkSummary: { passed: number; total: number };
  /** Catégories citées par le modèle, séparées en connues / à créer. */
  categories: { known: string[]; toCreate: string[] };
  incomeSources: { known: string[]; toCreate: string[] };
  warnings: string[];
}
