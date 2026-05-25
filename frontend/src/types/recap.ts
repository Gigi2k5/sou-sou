export type RecapPeriod = "week" | "month";

export interface RecapTotals {
  combined: number;
  savings: number;
  moneyPots: number;
}

export interface RecapBadge {
  code: string;
  name: string;
  icon: string;
  unlockedAt: string;
}

export interface RecapAvatar {
  key: string;
  unlockedAt: string;
}

export interface RecapBiggestDay {
  date: string;
  amount: number;
}

export interface RecapResult {
  period: RecapPeriod;
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  totals: RecapTotals;
  previousTotals: RecapTotals;
  delta: RecapTotals;
  activeDays: number;
  biggestDay: RecapBiggestDay | null;
  badges: RecapBadge[];
  avatars: RecapAvatar[];
}
