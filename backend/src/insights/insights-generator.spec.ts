import { generateInsights, type InsightsInput } from './insights-generator';

const fmt = (n: number) => `${Math.round(n)} FCFA`;

function baseInput(overrides: Partial<InsightsInput> = {}): InsightsInput {
  return {
    periodLabel: 'mai 2026',
    topCategories: [],
    comparison: {
      income: { current: 0, previous: 0, deltaPct: 0 },
      expense: { current: 0, previous: 0, deltaPct: 0 },
      saved: { current: 0, previous: 0, deltaPct: 0 },
      perCategory: [],
    },
    topDay: null,
    formatMoney: fmt,
    ...overrides,
  };
}

describe('insights-generator', () => {
  it('génère une phrase positive pour solde net positif', () => {
    const insights = generateInsights(
      baseInput({
        comparison: {
          income: { current: 200_000, previous: 180_000, deltaPct: 11.1 },
          expense: { current: 100_000, previous: 90_000, deltaPct: 11.1 },
          saved: { current: 0, previous: 0, deltaPct: 0 },
          perCategory: [],
        },
      }),
    );
    expect(
      insights.some((i) => i.includes('💪') && i.includes('positif')),
    ).toBe(true);
  });

  it('mentionne les revenus en hausse (>= 5%)', () => {
    const insights = generateInsights(
      baseInput({
        comparison: {
          income: { current: 110_000, previous: 100_000, deltaPct: 10 },
          expense: { current: 50_000, previous: 50_000, deltaPct: 0 },
          saved: { current: 0, previous: 0, deltaPct: 0 },
          perCategory: [],
        },
      }),
    );
    expect(insights.some((i) => i.includes('📈'))).toBe(true);
  });

  it('mentionne la baisse sur la catégorie #1 (>= -10%)', () => {
    const insights = generateInsights(
      baseInput({
        topCategories: [{ name: 'Transport', total: 30_000, percentage: 40 }],
        comparison: {
          income: { current: 0, previous: 0, deltaPct: 0 },
          expense: { current: 0, previous: 0, deltaPct: 0 },
          saved: { current: 0, previous: 0, deltaPct: 0 },
          perCategory: [{ name: 'Transport', deltaPct: -15 }],
        },
      }),
    );
    expect(
      insights.some((i) => i.includes('🎉') && i.includes('Transport')),
    ).toBe(true);
  });

  it('mentionne le top day avec moyenne par transaction', () => {
    const insights = generateInsights(
      baseInput({
        topDay: { day: 'Saturday', averagePerTransaction: 8500 },
      }),
    );
    expect(insights.some((i) => i.includes('samedi'))).toBe(true);
  });

  it('alerte si une catégorie hors top1 a explosé (>= 30%)', () => {
    const insights = generateInsights(
      baseInput({
        topCategories: [{ name: 'Nourriture', total: 50_000, percentage: 50 }],
        comparison: {
          income: { current: 0, previous: 0, deltaPct: 0 },
          expense: { current: 0, previous: 0, deltaPct: 0 },
          saved: { current: 0, previous: 0, deltaPct: 0 },
          perCategory: [{ name: 'Sorties', deltaPct: 50 }],
        },
      }),
    );
    expect(
      insights.some((i) => i.includes('⚠️') && i.includes('Sorties')),
    ).toBe(true);
  });

  it('alerte si solde net négatif', () => {
    const insights = generateInsights(
      baseInput({
        comparison: {
          income: { current: 50_000, previous: 60_000, deltaPct: -16 },
          expense: { current: 80_000, previous: 70_000, deltaPct: 14 },
          saved: { current: 0, previous: 0, deltaPct: 0 },
          perCategory: [],
        },
      }),
    );
    expect(
      insights.some((i) => i.includes('⚠️') && i.includes('dépassent')),
    ).toBe(true);
  });

  it('priorise les insights positifs avant les neutres et les warnings', () => {
    const insights = generateInsights(
      baseInput({
        topCategories: [{ name: 'Nourriture', total: 100, percentage: 50 }],
        comparison: {
          income: { current: 200_000, previous: 100_000, deltaPct: 100 },
          expense: { current: 80_000, previous: 60_000, deltaPct: 33 },
          saved: { current: 0, previous: 0, deltaPct: 0 },
          perCategory: [{ name: 'Sorties', deltaPct: 50 }],
        },
        topDay: { day: 'Friday', averagePerTransaction: 5000 },
      }),
    );
    // Les positifs (💪 ou 📈) doivent venir avant les warnings (⚠️)
    const firstPositive = insights.findIndex(
      (i) => i.startsWith('💪') || i.startsWith('📈') || i.startsWith('💰'),
    );
    const firstWarning = insights.findIndex((i) => i.startsWith('⚠️'));
    if (firstWarning >= 0 && firstPositive >= 0) {
      expect(firstPositive).toBeLessThan(firstWarning);
    }
  });

  it('limite la sortie à max 5 phrases', () => {
    const insights = generateInsights(
      baseInput({
        topCategories: [{ name: 'A', total: 100, percentage: 50 }],
        comparison: {
          income: { current: 100, previous: 50, deltaPct: 100 },
          expense: { current: 200, previous: 50, deltaPct: 300 },
          saved: { current: 50, previous: 25, deltaPct: 100 },
          perCategory: [
            { name: 'A', deltaPct: -20 },
            { name: 'B', deltaPct: 50 },
          ],
        },
        topDay: { day: 'Friday', averagePerTransaction: 5000 },
      }),
    );
    expect(insights.length).toBeLessThanOrEqual(5);
  });
});
