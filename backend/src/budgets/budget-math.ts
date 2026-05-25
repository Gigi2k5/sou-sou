/**
 * Logique pure de calcul d'un budget — testable sans Prisma.
 * Le service `BudgetsService` orchestre les requêtes DB autour de ces helpers.
 */

export type BudgetStatus = 'safe' | 'warning' | 'exceeded';

export interface BudgetCalc {
  currentSpent: number;
  percentageUsed: number;
  daysLeftInMonth: number;
  averagePerDayRemaining: number;
  status: BudgetStatus;
}

/** Renvoie [premier du mois 00:00 ; premier du mois suivant 00:00 [. */
export function monthRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

export function computeBudgetCalc(
  monthlyLimit: number,
  alertThreshold: number,
  currentSpent: number,
  now: Date,
  endOfMonth: Date,
): BudgetCalc {
  const percentageUsed =
    monthlyLimit > 0 ? (currentSpent / monthlyLimit) * 100 : 0;
  const remaining = Math.max(0, monthlyLimit - currentSpent);

  const msLeft = Math.max(0, endOfMonth.getTime() - now.getTime());
  // Au moins 1 jour pour éviter une division par zéro et un affichage absurde
  // le dernier jour du mois.
  const daysLeftInMonth = Math.max(1, Math.ceil(msLeft / 86_400_000));
  const averagePerDayRemaining =
    remaining > 0 ? remaining / daysLeftInMonth : 0;

  const status: BudgetStatus =
    currentSpent >= monthlyLimit
      ? 'exceeded'
      : currentSpent >= monthlyLimit * alertThreshold
        ? 'warning'
        : 'safe';

  return {
    currentSpent,
    percentageUsed,
    daysLeftInMonth,
    averagePerDayRemaining,
    status,
  };
}
