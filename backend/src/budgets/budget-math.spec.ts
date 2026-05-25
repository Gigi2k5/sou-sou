import { computeBudgetCalc, monthRange } from './budget-math';

/**
 * Couvre la logique pure de calcul du budget : status (safe/warning/exceeded),
 * pourcentage utilisé, jours restants dans le mois, moyenne par jour restant,
 * fenêtre calendaire du mois.
 */

describe('budget-math', () => {
  describe('monthRange', () => {
    it('renvoie le 1er du mois courant et le 1er du mois suivant', () => {
      const ref = new Date(2026, 4, 15, 14, 30); // 15 mai 2026 à 14h30
      const { start, end } = monthRange(ref);
      expect(start.toISOString()).toBe(
        new Date(2026, 4, 1, 0, 0, 0, 0).toISOString(),
      );
      expect(end.toISOString()).toBe(
        new Date(2026, 5, 1, 0, 0, 0, 0).toISOString(),
      );
    });

    it("gère le passage à l'année suivante (décembre → janvier)", () => {
      const ref = new Date(2026, 11, 28); // 28 déc 2026
      const { start, end } = monthRange(ref);
      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(11);
      expect(end.getFullYear()).toBe(2027);
      expect(end.getMonth()).toBe(0);
    });
  });

  describe('computeBudgetCalc', () => {
    const now = new Date(2026, 4, 15, 12, 0, 0); // 15 mai 2026
    const endOfMonth = new Date(2026, 5, 1, 0, 0, 0); // 1er juin 2026

    it('status=safe quand spent < threshold * limit', () => {
      const calc = computeBudgetCalc(50_000, 0.8, 30_000, now, endOfMonth);
      expect(calc.status).toBe('safe');
      expect(calc.percentageUsed).toBe(60);
    });

    it('status=warning quand spent atteint le seuil mais sous 100%', () => {
      const calc = computeBudgetCalc(50_000, 0.8, 40_000, now, endOfMonth);
      expect(calc.status).toBe('warning');
      expect(calc.percentageUsed).toBe(80);
    });

    it('status=warning au seuil exact', () => {
      const calc = computeBudgetCalc(100_000, 0.5, 50_000, now, endOfMonth);
      expect(calc.status).toBe('warning');
    });

    it('status=exceeded quand spent atteint la limite', () => {
      const calc = computeBudgetCalc(50_000, 0.8, 50_000, now, endOfMonth);
      expect(calc.status).toBe('exceeded');
      expect(calc.percentageUsed).toBe(100);
    });

    it('status=exceeded même très au-delà de la limite', () => {
      const calc = computeBudgetCalc(50_000, 0.8, 75_000, now, endOfMonth);
      expect(calc.status).toBe('exceeded');
      expect(calc.percentageUsed).toBe(150);
    });

    it('daysLeftInMonth correct au milieu du mois', () => {
      const calc = computeBudgetCalc(50_000, 0.8, 10_000, now, endOfMonth);
      // Du 15 mai 12h00 au 1er juin 00h00 = 16,5 jours → ceil = 17
      expect(calc.daysLeftInMonth).toBe(17);
    });

    it('daysLeftInMonth=1 minimum (le dernier jour du mois)', () => {
      const lastDay = new Date(2026, 4, 31, 23, 30, 0);
      const calc = computeBudgetCalc(50_000, 0.8, 10_000, lastDay, endOfMonth);
      expect(calc.daysLeftInMonth).toBe(1);
    });

    it('averagePerDayRemaining = remaining / daysLeft', () => {
      const calc = computeBudgetCalc(50_000, 0.8, 30_000, now, endOfMonth);
      // 20 000 restants sur 17 jours
      expect(calc.averagePerDayRemaining).toBeCloseTo(20_000 / 17, 0);
    });

    it('averagePerDayRemaining=0 si déjà dépassé', () => {
      const calc = computeBudgetCalc(50_000, 0.8, 60_000, now, endOfMonth);
      expect(calc.averagePerDayRemaining).toBe(0);
    });

    it('percentageUsed=0 si limit=0 (cas dégénéré)', () => {
      const calc = computeBudgetCalc(0, 0.8, 1000, now, endOfMonth);
      expect(calc.percentageUsed).toBe(0);
    });
  });
});
