export type BudgetStatus = "safe" | "warning" | "exceeded";

export interface Budget {
  id: string;
  monthlyLimit: number;
  alertThreshold: number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  };
  /** Somme des dépenses du mois en cours sur cette catégorie. */
  currentSpent: number;
  /** Pourcentage utilisé (0-X, peut dépasser 100). */
  percentageUsed: number;
  /** Jours restants jusqu'à fin du mois (1 minimum). */
  daysLeftInMonth: number;
  /** (limit - spent) / daysLeft, ou 0 si dépassé. */
  averagePerDayRemaining: number;
  status: BudgetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetInput {
  categoryId: string;
  monthlyLimit: number;
  alertThreshold?: number;
}

export interface UpdateBudgetInput {
  monthlyLimit?: number;
  alertThreshold?: number;
  isActive?: boolean;
}
