/**
 * Génération heuristique des phrases d'insights — logique pure, testable
 * sans Prisma. Le service les calcule à partir des agrégats déjà préparés.
 *
 * Priorité (pour rester motivant) :
 *   1. Positif (success, progress)
 *   2. Neutre (info)
 *   3. Warning (à surveiller)
 *
 * On retourne 3 à 5 phrases — on capte avec un slice à la fin.
 */

const DAY_LABELS_FR: Record<string, string> = {
  Monday: 'lundi',
  Tuesday: 'mardi',
  Wednesday: 'mercredi',
  Thursday: 'jeudi',
  Friday: 'vendredi',
  Saturday: 'samedi',
  Sunday: 'dimanche',
};

export interface InsightsInput {
  periodLabel: string;
  topCategories: { name: string; total: number; percentage: number }[];
  comparison: {
    income: { current: number; previous: number; deltaPct: number };
    expense: { current: number; previous: number; deltaPct: number };
    saved: { current: number; previous: number; deltaPct: number };
    perCategory: { name: string; deltaPct: number }[];
  };
  topDay: {
    day: string;
    averagePerTransaction: number;
  } | null;
  formatMoney: (amount: number) => string;
}

interface ScoredInsight {
  text: string;
  priority: number; // 0 = positif, 1 = neutre, 2 = warning
}

/** Catégorise un delta % en "bonne nouvelle / neutre / mauvaise" pour les dépenses.
 *  Pour les revenus/épargne, c'est l'inverse — handled séparément. */
function isBigChange(deltaPct: number): boolean {
  return Math.abs(deltaPct) >= 10;
}

export function generateInsights(input: InsightsInput): string[] {
  const out: ScoredInsight[] = [];
  const { topCategories, comparison, topDay, formatMoney } = input;

  // 1. Solde net positif
  const netCurrent = comparison.income.current - comparison.expense.current;
  if (netCurrent > 0 && comparison.income.current > 0) {
    out.push({
      text: `💪 Ton solde net est positif (${formatMoney(netCurrent)}) sur cette période, bravo !`,
      priority: 0,
    });
  }

  // 2. Revenus en hausse
  if (comparison.income.deltaPct >= 5 && comparison.income.previous > 0) {
    out.push({
      text: `📈 Tes revenus ont augmenté de ${comparison.income.deltaPct.toFixed(0)} % par rapport à la période précédente.`,
      priority: 0,
    });
  }

  // 3. Épargne en hausse
  if (comparison.saved.deltaPct >= 10 && comparison.saved.current > 0) {
    out.push({
      text: `💰 Tu as épargné ${comparison.saved.deltaPct.toFixed(0)} % de plus que la période précédente. Continue !`,
      priority: 0,
    });
  }

  // 4. Catégorie top : a baissé (positif)
  const topCategoryName = topCategories[0]?.name;
  if (topCategoryName) {
    const catDelta = comparison.perCategory.find(
      (c) => c.name === topCategoryName,
    );
    if (catDelta && catDelta.deltaPct <= -10) {
      out.push({
        text: `🎉 Tu as dépensé ${Math.abs(catDelta.deltaPct).toFixed(0)} % de moins en ${topCategoryName} par rapport à la période précédente !`,
        priority: 0,
      });
    }
  }

  // 5. Top catégorie de dépense (info neutre)
  if (topCategories.length > 0) {
    const top = topCategories[0];
    out.push({
      text: `🔍 Ta catégorie #1 de dépense est ${top.name} (${top.percentage.toFixed(0)} % de tes dépenses).`,
      priority: 1,
    });
  }

  // 6. Jour de la semaine où on dépense le plus (info neutre)
  if (topDay && topDay.averagePerTransaction > 0) {
    const dayFr = DAY_LABELS_FR[topDay.day] ?? topDay.day.toLowerCase();
    out.push({
      text: `📅 Tu dépenses le plus le ${dayFr} (${formatMoney(topDay.averagePerTransaction)} en moyenne par transaction).`,
      priority: 1,
    });
  }

  // 7. Catégorie qui a explosé (warning)
  const explodedCat = comparison.perCategory.find(
    (c) => c.deltaPct >= 30 && c.name !== topCategoryName,
  );
  if (explodedCat) {
    out.push({
      text: `⚠️ Tes dépenses en ${explodedCat.name} ont bondi de ${explodedCat.deltaPct.toFixed(0)} % vs la période précédente.`,
      priority: 2,
    });
  }

  // 8. Solde net négatif (warning) — uniquement si on n'a pas déjà dit que c'est positif
  if (netCurrent < 0 && comparison.expense.current > 0) {
    out.push({
      text: `⚠️ Tes dépenses dépassent tes revenus de ${formatMoney(Math.abs(netCurrent))} sur cette période.`,
      priority: 2,
    });
  }

  // 9. Dépenses globales en forte hausse (warning, fallback si rien d'autre)
  if (
    comparison.expense.deltaPct >= 20 &&
    comparison.expense.previous > 0 &&
    !explodedCat
  ) {
    out.push({
      text: `⚠️ Tes dépenses globales ont augmenté de ${comparison.expense.deltaPct.toFixed(0)} % par rapport à la période précédente.`,
      priority: 2,
    });
  }

  // Tri stable par priorité ascendante (positif d'abord), puis on prend max 5.
  out.sort((a, b) => a.priority - b.priority);
  return out.slice(0, 5).map((i) => i.text);
}

// Re-export pour les tests
export { isBigChange };
