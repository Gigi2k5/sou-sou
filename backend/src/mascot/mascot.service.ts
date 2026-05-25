import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { MascotContext } from './dto/mascot-query.dto';
import {
  pickRandom,
  QUOTES_DASHBOARD,
  QUOTES_RECAP,
  QUOTES_SAVINGS,
  type QuotePool,
} from './messages';

export type MascotMood =
  | 'idle'
  | 'happy'
  | 'celebrating'
  | 'warning'
  | 'encouraging'
  | 'thinking'
  | 'sleeping'
  | 'sad'
  | 'flying';

export interface MascotMessage {
  mood: MascotMood;
  message: string;
  emoji?: string;
}

@Injectable()
export class MascotService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sélectionne un message + un mood en fonction de l'état de l'user.
   * Les règles 1→9 sont prioritaires (signaux forts), la règle 10 est le
   * fallback : citations rotatives selon le contexte.
   */
  async build(userId: string, context: MascotContext): Promise<MascotMessage> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const last24h = subHours(now, 24);
    const last48h = subHours(now, 48);
    const last7d = subDays(now, 7);
    const last14d = subDays(now, 14);

    // Charge tout en parallèle pour rester sous 1 round-trip de latence.
    const [
      user,
      goal,
      recentAvatarUnlocks,
      monthIncome,
      monthExpense,
      lastTransaction,
      hasAnyActivityLast14d,
    ] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          name: true,
          currency: true,
          currentStreak: true,
          bestStreak: true,
          lastContributionAt: true,
        },
      }),
      this.prisma.savingsGoal.findUnique({
        where: { userId },
        select: {
          targetAmount: true,
          isCompleted: true,
          completedAt: true,
          category: { select: { id: true } },
        },
      }),
      this.prisma.avatarUnlock.findMany({
        where: {
          userId,
          unlockedAt: { gte: last24h },
          // Le cochon par défaut n'est pas une "réussite" qu'on célèbre.
          NOT: { avatarKey: 'pig-green' },
        },
        select: { avatarKey: true },
        orderBy: { unlockedAt: 'desc' },
        take: 1,
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
        select: { date: true },
      }),
      this.prisma.transaction.findFirst({
        where: {
          userId,
          OR: [{ date: { gte: last14d } }, { createdAt: { gte: last14d } }],
        },
        select: { id: true },
      }),
    ]);

    // ---- Règles ordonnées par priorité décroissante -----------------------
    const income = monthIncome._sum.amount ?? 0;
    const expense = monthExpense._sum.amount ?? 0;

    // 1. Dépenses du mois > revenus du mois
    if (expense > income && expense > 0) {
      return {
        mood: 'warning',
        message:
          "Attention ! Tu as dépensé plus que tu n'as gagné ce mois-ci. On respire et on se ressaisit !",
      };
    }

    // 3. Objectif d'épargne complété récemment (< 24h) — priorité haute
    //    (avant le 90% pour ne pas afficher "tu y es presque" alors que c'est fait)
    if (
      goal?.isCompleted &&
      goal.completedAt &&
      goal.completedAt.getTime() >= last24h.getTime()
    ) {
      return {
        mood: 'flying',
        message:
          'OBJECTIF ATTEINT ! Tu es incroyable, savoure cette victoire !',
        emoji: '🏆',
      };
    }

    // 2. Objectif d'épargne ≥ 90% (et pas déjà complété)
    if (goal && !goal.isCompleted && goal.targetAmount > 0 && goal.category) {
      const agg = await this.prisma.transaction.aggregate({
        where: {
          type: 'EXPENSE',
          expenseCategoryId: goal.category.id,
        },
        _sum: { amount: true },
      });
      const currentAmount = agg._sum.amount ?? 0;
      if (currentAmount / goal.targetAmount >= 0.9) {
        const remaining = Math.max(0, goal.targetAmount - currentAmount);
        return {
          mood: 'celebrating',
          message: `Tu y es presque ! Plus que ${formatAmount(remaining, user.currency)} pour atteindre ton objectif. On lâche rien !`,
        };
      }
    }

    // 5. Avatar débloqué récemment (< 24h)
    if (recentAvatarUnlocks.length > 0) {
      return {
        mood: 'celebrating',
        message:
          'Bravo pour ton nouvel avatar ! Ta collection grandit, ça motive !',
        emoji: '🎉',
      };
    }

    // 4. Streak ≥ 7 ET cotisé aujourd'hui
    if (
      user.currentStreak >= 7 &&
      user.lastContributionAt &&
      user.lastContributionAt.getTime() >= todayStart.getTime()
    ) {
      return {
        mood: 'happy',
        message: `${user.currentStreak} jours d'affilée ! Tu es une machine, continue comme ça !`,
        emoji: '🔥',
      };
    }

    // 6. Pas cotisé aujourd'hui ET il est après 18h (et a un goal actif)
    const hasNotContributedToday =
      !user.lastContributionAt ||
      user.lastContributionAt.getTime() < todayStart.getTime();
    if (
      hasNotContributedToday &&
      goal &&
      !goal.isCompleted &&
      now.getHours() >= 18
    ) {
      return {
        mood: 'warning',
        message:
          "Hé, n'oublie pas ta cotisation du jour ! Ton futur toi te remerciera.",
      };
    }

    // 7. Streak récemment cassé (≤ 2 jours, currentStreak=0 mais bestStreak≥1)
    if (
      user.currentStreak === 0 &&
      user.bestStreak >= 1 &&
      user.lastContributionAt &&
      user.lastContributionAt.getTime() >= last48h.getTime() &&
      user.lastContributionAt.getTime() < todayStart.getTime()
    ) {
      return {
        mood: 'encouraging',
        message:
          "Pas grave pour hier, on reprend aujourd'hui ! Un nouveau streak commence maintenant.",
      };
    }

    // 8. Aucune transaction depuis 7 jours
    if (!lastTransaction || lastTransaction.date.getTime() < last7d.getTime()) {
      return {
        mood: 'thinking',
        message:
          "Hum… N'oublie pas de noter tes transactions pour bien suivre ton budget !",
      };
    }

    // 9. User totalement inactif depuis > 14 jours
    if (!hasAnyActivityLast14d) {
      return {
        mood: 'sleeping',
        message: "Tu m'as manqué… On reprend où on s'était arrêté ?",
      };
    }

    // 10. Fallback : citations rotatives selon le contexte.
    const pool = getQuotePool(context);
    const quote = pickRandom(pool);
    return {
      mood: quote.mood,
      message: quote.message,
      emoji: quote.emoji,
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

function getQuotePool(context: MascotContext): QuotePool {
  switch (context) {
    case MascotContext.SAVINGS:
      return QUOTES_SAVINGS;
    case MascotContext.RECAP:
      return QUOTES_RECAP;
    case MascotContext.DASHBOARD:
    default:
      return QUOTES_DASHBOARD;
  }
}

function formatAmount(amount: number, currency: string): string {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(rounded);
  if (currency === 'FCFA' || currency === 'XOF' || currency === 'XAF') {
    return `${formatted} FCFA`;
  }
  return `${formatted} ${currency}`;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function subDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() - days);
  return out;
}
function subHours(d: Date, hours: number): Date {
  return new Date(d.getTime() - hours * 3600_000);
}
