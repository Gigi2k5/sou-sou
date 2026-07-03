import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryKind, NotifType, Prisma } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeBudgetCalc,
  monthRange,
  type BudgetStatus,
} from './budget-math';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

export type { BudgetStatus };

export interface BudgetWithCalculations {
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
  /** Jours restants jusqu'à fin du mois (0 le dernier jour à minuit). */
  daysLeftInMonth: number;
  /** (limit - spent) / daysLeft, ou 0 si dépassé / dernier jour. */
  averagePerDayRemaining: number;
  status: BudgetStatus;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(userId: string): Promise<BudgetWithCalculations[]> {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const { start, end } = monthRange(new Date());
    const now = new Date();

    // Agrège les dépenses du mois pour toutes les catégories en une requête.
    const categoryIds = budgets.map((b) => b.categoryId);
    const sums =
      categoryIds.length === 0
        ? []
        : await this.prisma.transaction.groupBy({
            by: ['expenseCategoryId'],
            where: {
              userId,
              type: 'EXPENSE',
              expenseCategoryId: { in: categoryIds },
              date: { gte: start, lt: end },
            },
            _sum: { amount: true },
          });
    const sumByCategory = new Map(
      sums.map((s) => [s.expenseCategoryId ?? '', s._sum.amount ?? 0]),
    );

    return budgets.map((b) =>
      buildCalculations(b, sumByCategory.get(b.categoryId) ?? 0, now, end),
    );
  }

  async create(
    userId: string,
    dto: CreateBudgetDto,
  ): Promise<BudgetWithCalculations> {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Catégorie introuvable.');
    if (category.userId !== userId) {
      throw new ForbiddenException(
        "Cette catégorie n'appartient pas à ton compte.",
      );
    }
    if (category.kind !== CategoryKind.FREE) {
      throw new BadRequestException(
        "Les budgets ne s'appliquent qu'aux catégories de dépense libres (pas l'épargne ni les pots).",
      );
    }

    try {
      const created = await this.prisma.budget.create({
        data: {
          userId,
          categoryId: dto.categoryId,
          monthlyLimit: dto.monthlyLimit,
          alertThreshold: dto.alertThreshold ?? 0.8,
        },
        include: { category: { select: { id: true, name: true } } },
      });

      const { start, end } = monthRange(new Date());
      const sumAgg = await this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          expenseCategoryId: dto.categoryId,
          date: { gte: start, lt: end },
        },
        _sum: { amount: true },
      });
      return buildCalculations(
        created,
        sumAgg._sum.amount ?? 0,
        new Date(),
        end,
      );
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Un budget existe déjà pour cette catégorie.',
        );
      }
      throw err;
    }
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<BudgetWithCalculations> {
    const existing = await this.prisma.budget.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Budget introuvable.');
    if (existing.userId !== userId) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.monthlyLimit !== undefined
          ? { monthlyLimit: dto.monthlyLimit }
          : {}),
        ...(dto.alertThreshold !== undefined
          ? { alertThreshold: dto.alertThreshold }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
    });

    const { start, end } = monthRange(new Date());
    const sumAgg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        expenseCategoryId: updated.categoryId,
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    return buildCalculations(updated, sumAgg._sum.amount ?? 0, new Date(), end);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.budget.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Budget introuvable.');
    if (existing.userId !== userId) throw new ForbiddenException();
    await this.prisma.budget.delete({ where: { id } });
  }

  /**
   * Hook appelé après chaque création de transaction EXPENSE en catégorie FREE.
   * Envoie une notif WARNING si on franchit le seuil d'alerte, ou EXCEEDED
   * si on dépasse 100%, en évitant les doublons par mois calendaire.
   */
  async checkAndNotify(userId: string, categoryId: string): Promise<void> {
    const budget = await this.prisma.budget.findUnique({
      where: { categoryId },
      include: { category: { select: { name: true } } },
    });
    if (!budget || budget.userId !== userId || !budget.isActive) return;

    const { start, end } = monthRange(new Date());
    const sumAgg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        expenseCategoryId: categoryId,
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    const currentSpent = sumAgg._sum.amount ?? 0;
    const limit = budget.monthlyLimit;
    const thresholdAmount = limit * budget.alertThreshold;

    const exceeded = currentSpent >= limit;
    const warning = currentSpent >= thresholdAmount;
    if (!warning && !exceeded) return;

    // Dédup : on regarde si une notif du même type pour ce budget a déjà été
    // envoyée ce mois calendaire — si oui, on saute.
    const targetType: NotifType = exceeded
      ? NotifType.BUDGET_EXCEEDED
      : NotifType.BUDGET_WARNING;

    // Dédup safe : on récupère toutes les notifs du bon type du mois pour cet
    // user (max quelques dizaines par mois), puis on filtre en JS sur data.budgetId.
    // Plus robuste que Prisma `data: { path, equals }` qui peut ne pas matcher
    // selon la version Postgres/Prisma.
    const monthNotifs = await this.prisma.notification.findMany({
      where: {
        userId,
        type: targetType,
        createdAt: { gte: start },
      },
      select: { data: true },
    });
    const alreadySent = monthNotifs.some(
      (n) =>
        typeof n.data === 'object' &&
        n.data !== null &&
        !Array.isArray(n.data) &&
        (n.data as Record<string, unknown>).budgetId === budget.id,
    );
    if (alreadySent) return;

    const categoryName = budget.category.name;
    if (exceeded) {
      await this.notifications.create({
        userId,
        type: NotifType.BUDGET_EXCEEDED,
        title: 'Budget dépassé',
        body: `Tu as dépassé ton budget « ${categoryName} » ce mois-ci.`,
        data: {
          budgetId: budget.id,
          categoryId,
          categoryName,
          monthlyLimit: limit,
          currentSpent,
        },
      });
    } else {
      await this.notifications.create({
        userId,
        type: NotifType.BUDGET_WARNING,
        title: 'Budget bientôt atteint',
        body: `Tu as atteint ${Math.round(
          (currentSpent / limit) * 100,
        )} % de ton budget « ${categoryName} » ce mois-ci.`,
        data: {
          budgetId: budget.id,
          categoryId,
          categoryName,
          monthlyLimit: limit,
          currentSpent,
        },
      });
    }
  }
}

interface BudgetWithCategory {
  id: string;
  monthlyLimit: number;
  alertThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string };
}

function buildCalculations(
  budget: BudgetWithCategory,
  currentSpent: number,
  now: Date,
  endOfMonth: Date,
): BudgetWithCalculations {
  const calc = computeBudgetCalc(
    budget.monthlyLimit,
    budget.alertThreshold,
    currentSpent,
    now,
    endOfMonth,
  );
  return {
    id: budget.id,
    monthlyLimit: budget.monthlyLimit,
    alertThreshold: budget.alertThreshold,
    isActive: budget.isActive,
    category: budget.category,
    currentSpent: calc.currentSpent,
    percentageUsed: calc.percentageUsed,
    daysLeftInMonth: calc.daysLeftInMonth,
    averagePerDayRemaining: calc.averagePerDayRemaining,
    status: calc.status,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}
