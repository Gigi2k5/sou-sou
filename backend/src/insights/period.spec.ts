import { InsightsPeriod } from './dto/insights-query.dto';
import {
  computePeriod,
  computePreviousPeriod,
  listLast6Months,
  percentDelta,
} from './period';

describe('insights/period', () => {
  describe('computePeriod', () => {
    const ref = new Date(2026, 4, 15, 12, 0); // 15 mai 2026 à 12h

    it('current_month → 1er mai → 1er juin', () => {
      const r = computePeriod(InsightsPeriod.CURRENT_MONTH, ref);
      expect(r.start.toISOString()).toBe(new Date(2026, 4, 1).toISOString());
      expect(r.end.toISOString()).toBe(new Date(2026, 5, 1).toISOString());
      expect(r.label).toBe('mai 2026');
    });

    it('last_month → 1er avril → 1er mai', () => {
      const r = computePeriod(InsightsPeriod.LAST_MONTH, ref);
      expect(r.start.toISOString()).toBe(new Date(2026, 3, 1).toISOString());
      expect(r.end.toISOString()).toBe(new Date(2026, 4, 1).toISOString());
      expect(r.label).toBe('avril 2026');
    });

    it('last_3_months → 1er mars → 1er juin', () => {
      const r = computePeriod(InsightsPeriod.LAST_3_MONTHS, ref);
      expect(r.start.toISOString()).toBe(new Date(2026, 2, 1).toISOString());
      expect(r.end.toISOString()).toBe(new Date(2026, 5, 1).toISOString());
      expect(r.label).toBe('3 derniers mois');
    });

    it('last_6_months → 1er décembre 2025 → 1er juin 2026', () => {
      const r = computePeriod(InsightsPeriod.LAST_6_MONTHS, ref);
      expect(r.start.toISOString()).toBe(new Date(2025, 11, 1).toISOString());
      expect(r.end.toISOString()).toBe(new Date(2026, 5, 1).toISOString());
    });

    it("passe correctement à l'année précédente (janvier)", () => {
      const jan = new Date(2026, 0, 10);
      const r = computePeriod(InsightsPeriod.LAST_MONTH, jan);
      expect(r.start.getFullYear()).toBe(2025);
      expect(r.start.getMonth()).toBe(11);
    });
  });

  describe('computePreviousPeriod', () => {
    const ref = new Date(2026, 4, 15, 12, 0); // 15 mai

    it("current_month (15 mai) → période d'avril équivalente (15 j)", () => {
      const cur = computePeriod(InsightsPeriod.CURRENT_MONTH, ref);
      const prev = computePreviousPeriod(cur, InsightsPeriod.CURRENT_MONTH);
      expect(prev.start.getMonth()).toBe(3); // avril
      // Décalage de 14 jours (15 - 1)
      const elapsed = cur.end.getTime() - cur.start.getTime();
      expect(prev.end.getTime() - prev.start.getTime()).toBe(elapsed);
    });

    it('last_month → mois précédent du mois précédent', () => {
      const cur = computePeriod(InsightsPeriod.LAST_MONTH, ref);
      const prev = computePreviousPeriod(cur, InsightsPeriod.LAST_MONTH);
      // cur = avril 2026 → prev = mars 2026
      expect(prev.start.getMonth()).toBe(2);
      expect(prev.end.getMonth()).toBe(3);
    });

    it('last_3_months → 3 mois encore avant', () => {
      const cur = computePeriod(InsightsPeriod.LAST_3_MONTHS, ref);
      const prev = computePreviousPeriod(cur, InsightsPeriod.LAST_3_MONTHS);
      // cur = mars-mai 2026 → prev = déc 2025-fév 2026
      expect(prev.start.getFullYear()).toBe(2025);
      expect(prev.start.getMonth()).toBe(11);
      expect(prev.end.getFullYear()).toBe(2026);
      expect(prev.end.getMonth()).toBe(2);
    });
  });

  describe('listLast6Months', () => {
    it('renvoie 6 mois ascendants en format YYYY-MM', () => {
      const ref = new Date(2026, 4, 20);
      const months = listLast6Months(ref);
      expect(months).toEqual([
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
      ]);
    });
  });

  describe('percentDelta', () => {
    it('renvoie la variation % arrondie à 1 décimale', () => {
      expect(percentDelta(120, 100)).toBe(20);
      expect(percentDelta(85, 100)).toBe(-15);
      expect(percentDelta(100, 100)).toBe(0);
    });

    it('renvoie 100 si previous=0 et current>0', () => {
      expect(percentDelta(50, 0)).toBe(100);
    });

    it('renvoie 0 si tout vaut 0', () => {
      expect(percentDelta(0, 0)).toBe(0);
    });

    it('arrondit à 1 décimale', () => {
      expect(percentDelta(133.4, 100)).toBe(33.4);
    });
  });
});
