import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { AvatarUnlocksService } from '../avatar-unlocks/avatar-unlocks.service';
import { BudgetsService } from '../budgets/budgets.service';
import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const POT_POINTS_PER_PAYMENT = 5;
const POT_POINTS_COMPLETED = 30;
const PROGRESS_THRESHOLDS = [50, 80] as const;

interface CategoryInfo {
  id: string;
  kind: 'FREE' | 'SAVINGS' | 'POT';
  moneyPotId: string | null;
  savingsGoalId: string | null;
}

/**
 * Effets de bord déclenchés par le cycle de vie d'une `Transaction` dont la
 * catégorie est système (kind SAVINGS ou POT).
 *
 * - **Création** d'une expense en SAVINGS → gamification quotidienne (streak +
 *   points + badges), check des paliers (50/80%) et de la complétion.
 * - **Création** d'une expense en POT → +5 pts de base, +30 si complétion,
 *   notif owner (PAYMENT_RECEIVED), notifs membres (PROGRESS / COMPLETED).
 * - **Update / Remove** : on ne rembourse pas les points/streak. On réévalue
 *   simplement `isCompleted` (peut basculer dans un sens ou l'autre).
 *
 * Les notifs de paliers sont idempotentes via `progressNotified[]` sur le pot
 * ou le goal — un palier déjà franchi ne re-notifie pas, même si l'user
 * édite/supprime des transactions et retraverse le seuil.
 */
@Injectable()
export class TransactionHooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
    private readonly avatarUnlocks: AvatarUnlocksService,
    private readonly notifications: NotificationsService,
    private readonly budgets: BudgetsService,
  ) {}

  /**
   * À appeler après création d'une Transaction (hors `$transaction` métier —
   * on enchaîne les effets dans une nouvelle tx). `categoryId` peut être null.
   */
  async onCreated(
    userId: string,
    transactionId: string,
    categoryId: string | null,
    amount: number,
    date: Date,
    type: 'INCOME' | 'EXPENSE' = 'EXPENSE',
  ) {
    const cat = categoryId ? await this.loadCategory(categoryId) : null;
    if (!cat || cat.kind === 'FREE') {
      // Trigger avatars quand même (badges "10 transactions" etc.)
      await this.avatarUnlocks.checkAndUnlock(userId);
      // Vérifie le budget si dépense FREE — peut envoyer une notif WARNING/EXCEEDED.
      if (cat && cat.kind === 'FREE' && type === 'EXPENSE') {
        await this.budgets.checkAndNotify(userId, cat.id);
      }
      return;
    }

    if (cat.kind === 'SAVINGS' && cat.savingsGoalId) {
      await this.applySavingsCreate(userId, cat.savingsGoalId, date);
    } else if (cat.kind === 'POT' && cat.moneyPotId) {
      await this.applyPotCreate(userId, cat.moneyPotId, amount);
    }

    await this.avatarUnlocks.checkAndUnlock(userId);
    void transactionId;
  }

  /**
   * À appeler après update. Reévalue la complétion du pot/goal impacté
   * (ancienne ET nouvelle catégorie).
   */
  async onUpdated(
    userId: string,
    oldCategoryId: string | null,
    newCategoryId: string | null,
  ) {
    const ids = [oldCategoryId, newCategoryId].filter(
      (id): id is string => !!id,
    );
    const unique = Array.from(new Set(ids));
    for (const id of unique) {
      const cat = await this.loadCategory(id);
      if (!cat) continue;
      if (cat.kind === 'SAVINGS' && cat.savingsGoalId) {
        await this.reevaluateSavingsCompletion(cat.savingsGoalId);
      } else if (cat.kind === 'POT' && cat.moneyPotId) {
        await this.reevaluatePotCompletion(cat.moneyPotId);
      }
    }
    await this.avatarUnlocks.checkAndUnlock(userId);
  }

  /**
   * À appeler après suppression. Reévalue la complétion (peut redescendre).
   */
  async onRemoved(userId: string, removedCategoryId: string | null) {
    if (removedCategoryId) {
      const cat = await this.loadCategory(removedCategoryId);
      if (cat) {
        if (cat.kind === 'SAVINGS' && cat.savingsGoalId) {
          await this.reevaluateSavingsCompletion(cat.savingsGoalId);
        } else if (cat.kind === 'POT' && cat.moneyPotId) {
          await this.reevaluatePotCompletion(cat.moneyPotId);
        }
      }
    }
    await this.avatarUnlocks.checkAndUnlock(userId);
  }

  // --- SAVINGS --------------------------------------------------------------

  private async applySavingsCreate(
    userId: string,
    goalId: string,
    contribDate: Date,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findUnique({
        where: { id: goalId },
        include: { category: { select: { id: true } } },
      });
      if (!goal || !goal.category) return;

      const currentAmount = await this.sumCategoryExpenses(
        tx,
        goal.category.id,
      );
      const wasCompleted = goal.isCompleted;
      const justCompleted = !wasCompleted && currentAmount >= goal.targetAmount;

      // Paliers à notifier (50/80) — uniquement si pas déjà notifiés.
      const newPercent = this.percentOf(currentAmount, goal.targetAmount);
      const newlyCrossed = PROGRESS_THRESHOLDS.filter(
        (t) => newPercent >= t && !goal.progressNotified.includes(t),
      );

      await tx.savingsGoal.update({
        where: { id: goal.id },
        data: {
          ...(justCompleted
            ? { isCompleted: true, completedAt: new Date() }
            : {}),
          ...(newlyCrossed.length > 0
            ? { progressNotified: { push: newlyCrossed } }
            : {}),
        },
      });

      // Gamification — toujours dans la tx pour rester atomique.
      await this.gamification.applyContribution(tx, userId, contribDate);
      if (justCompleted) {
        await this.gamification.applyGoalCompleted(tx, userId);
      }

      // Notifs paliers (in-tx pour annuler-tout-ou-rien si erreur).
      for (const threshold of newlyCrossed) {
        await this.notifications.create(
          {
            userId,
            type: 'CONTRIBUTION_GOAL_PROGRESS',
            title: `Épargne à ${threshold} % !`,
            body: `Tu as atteint ${threshold} % de ton objectif « ${goal.name} ». Continue !`,
            data: { savingsGoalId: goalId, threshold },
          },
          tx,
        );
      }
    });
  }

  private async reevaluateSavingsCompletion(goalId: string) {
    const goal = await this.prisma.savingsGoal.findUnique({
      where: { id: goalId },
      include: { category: { select: { id: true } } },
    });
    if (!goal || !goal.category) return;
    const currentAmount = await this.sumCategoryExpenses(
      this.prisma,
      goal.category.id,
    );

    if (!goal.isCompleted && currentAmount >= goal.targetAmount) {
      await this.prisma.$transaction(async (tx) => {
        await tx.savingsGoal.update({
          where: { id: goalId },
          data: { isCompleted: true, completedAt: new Date() },
        });
        await this.gamification.applyGoalCompleted(tx, goal.userId);
      });
    } else if (goal.isCompleted && currentAmount < goal.targetAmount) {
      await this.prisma.savingsGoal.update({
        where: { id: goalId },
        data: { isCompleted: false, completedAt: null },
      });
    }
  }

  // --- POT ------------------------------------------------------------------

  private async applyPotCreate(userId: string, potId: string, amount: number) {
    await this.prisma.$transaction(async (tx) => {
      const pot = await tx.moneyPot.findUnique({
        where: { id: potId },
        include: { categories: { select: { id: true } } },
      });
      if (!pot) return;

      const currentAmount = await this.sumCategoriesExpenses(
        tx,
        pot.categories.map((c) => c.id),
      );
      const wasCompleted = pot.isCompleted;
      const justCompleted = !wasCompleted && currentAmount >= pot.targetAmount;

      const newPercent = this.percentOf(currentAmount, pot.targetAmount);
      const newlyCrossed = PROGRESS_THRESHOLDS.filter(
        (t) => newPercent >= t && !pot.progressNotified.includes(t),
      );

      await tx.moneyPot.update({
        where: { id: potId },
        data: {
          ...(justCompleted
            ? { isCompleted: true, completedAt: new Date() }
            : {}),
          ...(newlyCrossed.length > 0
            ? { progressNotified: { push: newlyCrossed } }
            : {}),
        },
      });

      // Gamification : +5 par paiement, +30 si complétion (toujours en tx).
      const points =
        POT_POINTS_PER_PAYMENT + (justCompleted ? POT_POINTS_COMPLETED : 0);
      await tx.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: points } },
      });

      // Notifs (in-tx pour atomicité).
      const memberIds = await tx.moneyPotMember
        .findMany({
          where: { moneyPotId: potId },
          select: { userId: true },
        })
        .then((rows) => rows.map((r) => r.userId));

      // PAYMENT_RECEIVED → owner uniquement (sauf s'il a payé lui-même).
      if (pot.ownerId !== userId) {
        const payer = await tx.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        await this.notifications.create(
          {
            userId: pot.ownerId,
            type: 'CONTRIBUTION_PAYMENT_RECEIVED',
            title: `${payer?.name ?? "Quelqu'un"} a cotisé`,
            body: `${formatAmount(amount)} ajouté(s) à « ${pot.name} ».`,
            data: { moneyPotId: potId, payerId: userId, amount },
          },
          tx,
        );
      }

      // PROGRESS 50/80 → tous les membres (idempotent).
      for (const threshold of newlyCrossed) {
        for (const memberId of memberIds) {
          await this.notifications.create(
            {
              userId: memberId,
              type: 'CONTRIBUTION_GOAL_PROGRESS',
              title: `Cotisation à ${threshold} % !`,
              body: `« ${pot.name} » est à ${threshold} % de l'objectif. Encore un effort !`,
              data: { moneyPotId: potId, threshold },
            },
            tx,
          );
        }
      }

      // COMPLETED → tous les membres.
      if (justCompleted) {
        for (const memberId of memberIds) {
          await this.notifications.create(
            {
              userId: memberId,
              type: 'CONTRIBUTION_GOAL_COMPLETED',
              title: 'Cotisation atteinte !',
              body: `« ${pot.name} » a atteint son objectif. Bravo à toute l'équipe !`,
              data: { moneyPotId: potId },
            },
            tx,
          );
        }
      }
    });
  }

  private async reevaluatePotCompletion(potId: string) {
    const pot = await this.prisma.moneyPot.findUnique({
      where: { id: potId },
      include: { categories: { select: { id: true } } },
    });
    if (!pot) return;
    const currentAmount = await this.sumCategoriesExpenses(
      this.prisma,
      pot.categories.map((c) => c.id),
    );

    if (!pot.isCompleted && currentAmount >= pot.targetAmount) {
      await this.prisma.moneyPot.update({
        where: { id: potId },
        data: { isCompleted: true, completedAt: new Date() },
      });
    } else if (pot.isCompleted && currentAmount < pot.targetAmount) {
      await this.prisma.moneyPot.update({
        where: { id: potId },
        data: { isCompleted: false, completedAt: null },
      });
    }
  }

  // --- Helpers --------------------------------------------------------------

  private async loadCategory(categoryId: string): Promise<CategoryInfo | null> {
    const cat = await this.prisma.expenseCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        kind: true,
        moneyPotId: true,
        savingsGoalId: true,
      },
    });
    return cat;
  }

  private async sumCategoryExpenses(
    client: PrismaService | Prisma.TransactionClient,
    categoryId: string,
  ): Promise<number> {
    const agg = await client.transaction.aggregate({
      where: { type: 'EXPENSE', expenseCategoryId: categoryId },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  private async sumCategoriesExpenses(
    client: PrismaService | Prisma.TransactionClient,
    categoryIds: string[],
  ): Promise<number> {
    if (categoryIds.length === 0) return 0;
    const agg = await client.transaction.aggregate({
      where: { type: 'EXPENSE', expenseCategoryId: { in: categoryIds } },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  private percentOf(current: number, target: number): number {
    return target > 0 ? (current / target) * 100 : 0;
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
    Math.round(amount),
  );
}
