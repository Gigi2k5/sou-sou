import { InsightsPeriod } from './dto/insights-query.dto';

export interface PeriodRange {
  /** Inclusif : début de la période. */
  start: Date;
  /** Exclusif : début du jour suivant la fin (utiliser `lt: end` en query). */
  end: Date;
  /** Label lisible pour le frontend. */
  label: string;
}

const MONTHS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/**
 * Renvoie la période [start, end[ correspondant au paramètre `period`, à partir
 * d'une date de référence (now par défaut). Les périodes sont **calendaires** :
 * `current_month` = du 1er du mois courant à l'instant t.
 * `last_month` = mois calendaire précédent complet.
 * `last_3_months` / `last_6_months` = N derniers mois calendaires complets +
 * le mois courant jusqu'à maintenant.
 */
export function computePeriod(
  period: InsightsPeriod,
  now: Date = new Date(),
): PeriodRange {
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (period) {
    case InsightsPeriod.CURRENT_MONTH: {
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 1, 0, 0, 0, 0);
      return {
        start,
        end,
        label: `${MONTHS_FR[m]} ${y}`,
      };
    }
    case InsightsPeriod.LAST_MONTH: {
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 1, 0, 0, 0, 0);
      return {
        start,
        end,
        label: `${MONTHS_FR[start.getMonth()]} ${start.getFullYear()}`,
      };
    }
    case InsightsPeriod.LAST_3_MONTHS: {
      const start = new Date(y, m - 2, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 1, 0, 0, 0, 0);
      return { start, end, label: '3 derniers mois' };
    }
    case InsightsPeriod.LAST_6_MONTHS: {
      const start = new Date(y, m - 5, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 1, 0, 0, 0, 0);
      return { start, end, label: '6 derniers mois' };
    }
  }
}

/**
 * Renvoie la période immédiatement précédente, de même durée, pour les
 * comparaisons "vs période précédente".
 *
 * Exemple : `current_month` (1er mai → 15 mai) vs (1er avril → 15 avril).
 * On préserve le décalage en jours pour qu'un mid-month reste comparable.
 */
export function computePreviousPeriod(
  current: PeriodRange,
  period: InsightsPeriod,
): PeriodRange {
  const y = current.start.getFullYear();
  const m = current.start.getMonth();

  switch (period) {
    case InsightsPeriod.CURRENT_MONTH: {
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      // Même décalage en jours que current.end - current.start
      const elapsedMs = current.end.getTime() - current.start.getTime();
      const end = new Date(start.getTime() + elapsedMs);
      return {
        start,
        end,
        label: `${MONTHS_FR[start.getMonth()]} ${start.getFullYear()}`,
      };
    }
    case InsightsPeriod.LAST_MONTH: {
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 1, 0, 0, 0, 0);
      return {
        start,
        end,
        label: `${MONTHS_FR[start.getMonth()]} ${start.getFullYear()}`,
      };
    }
    case InsightsPeriod.LAST_3_MONTHS: {
      const start = new Date(y, m - 3, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 1, 0, 0, 0, 0);
      return { start, end, label: '3 mois précédents' };
    }
    case InsightsPeriod.LAST_6_MONTHS: {
      const start = new Date(y, m - 6, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 1, 0, 0, 0, 0);
      return { start, end, label: '6 mois précédents' };
    }
  }
}

/**
 * Renvoie la liste des 6 derniers mois calendaires, du plus ancien au plus
 * récent (mois courant inclus). Format `2026-05`.
 */
export function listLast6Months(now: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    out.push(`${d.getFullYear()}-${month}`);
  }
  return out;
}

/** Variation en pourcentage signé entre 2 valeurs. */
export function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
