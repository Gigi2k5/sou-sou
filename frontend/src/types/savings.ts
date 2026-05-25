export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  /** Dérivé : somme des Transaction expense liées à la catégorie SAVINGS. */
  currentAmount: number;
  dailyAmount: number;
  deadline: string;
  isCompleted: boolean;
  /** Catégorie système SAVINGS — sert au modal "Cotiser" pour créer une Transaction. */
  categoryId: string | null;
  userId: string;
  createdAt: string;
  completedAt: string | null;
}

/** Une "contribution" = une Transaction expense liée à la catégorie SAVINGS. */
export interface SavingsContribution {
  id: string;
  amount: number;
  date: string;
  note: string | null;
}

export interface BadgeFront {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserBadgeFront extends BadgeFront {
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface GamificationStats {
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  lastContributionAt: string | null;
  unlockedBadges: number;
  totalBadges: number;
}
