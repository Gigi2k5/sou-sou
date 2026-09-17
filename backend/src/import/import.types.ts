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

/**
 * Totaux lus DANS le document source, quand il en contient.
 *
 * `gross` couvre le cas dominant : un carnet écrit « Total = 32000 », un seul
 * nombre, sans distinguer entrées et sorties. Il DOIT rester distinct de
 * `income`/`expense`, sans quoi la référence bougerait au gré du classement
 * des lignes — et une référence qui bouge ne vérifie plus rien.
 *
 * `income`/`expense` ne sont renseignés que si le document sépare lui-même les
 * deux sens (deux colonnes, « Entrées : … · Sorties : … »).
 */
export interface DeclaredTotals {
  gross?: number;
  income?: number;
  expense?: number;
}

export interface DeclaredDailyTotal {
  date: string;
  gross?: number;
  income?: number;
  expense?: number;
}

/** Total hebdomadaire annoncé, avec les jours qu'il prétend couvrir. */
export interface DeclaredWeeklyTotal {
  label?: string;
  from: string;
  to: string;
  gross?: number;
  income?: number;
  expense?: number;
}

/** Réponse brute du modèle. */
export interface ExtractionResult {
  periodLabel?: string;
  onlyExpenses?: boolean;
  declaredPeriodTotals?: DeclaredTotals;
  declaredDailyTotals?: DeclaredDailyTotal[];
  declaredWeeklyTotals?: DeclaredWeeklyTotal[];
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
/** `gross` = toutes lignes confondues, quel que soit leur sens. */
export type Measure = Direction | 'gross';

export interface Checkpoint {
  scope: 'period' | 'week' | 'day';
  /** Date ISO pour un jour, libellé lisible pour une semaine ou la période. */
  label: string;
  direction: Measure;
  declared: number;
  computed: number;
  ok: boolean;
  /** Bornes ISO — renseignées pour les semaines, afin de recalculer côté client. */
  from?: string;
  to?: string;
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
