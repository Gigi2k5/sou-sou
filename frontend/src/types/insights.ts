export type InsightsPeriod =
  | "current_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months";

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface InsightsTopCategory {
  categoryId: string;
  name: string;
  total: number;
  percentage: number;
  transactionCount: number;
}

export interface InsightsMonthlyEvolutionPoint {
  month: string;
  income: number;
  expense: number;
  saved: number;
  netBalance: number;
}

export interface InsightsComparisonPeriod {
  current: number;
  previous: number;
  deltaPct: number;
}

export interface InsightsComparison {
  income: InsightsComparisonPeriod;
  expense: InsightsComparisonPeriod;
  saved: InsightsComparisonPeriod;
  perCategory: {
    name: string;
    current: number;
    previous: number;
    deltaPct: number;
  }[];
}

export interface InsightsSpendingByDay {
  day: DayOfWeek;
  total: number;
  transactionCount: number;
  averagePerTransaction: number;
}

export interface InsightsSpendingByMonth {
  week1: number;
  week2: number;
  week3: number;
  week4: number;
}

export interface InsightsResponse {
  period: { start: string; end: string; label: string };
  topExpenseCategories: InsightsTopCategory[];
  monthlyEvolution: InsightsMonthlyEvolutionPoint[];
  comparisonToPrevious: InsightsComparison;
  spendingByDayOfWeek: InsightsSpendingByDay[];
  spendingByTimeOfMonth: InsightsSpendingByMonth;
  insights: string[];
}
