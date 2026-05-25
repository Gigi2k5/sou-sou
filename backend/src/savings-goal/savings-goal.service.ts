import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, SavingsGoal } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

export interface SavingsGoalWithProgress extends SavingsGoal {
  /** Somme des Transaction expense dans la catégorie système SAVINGS. */
  currentAmount: number;
  /** ID de la catégorie SAVINGS auto-créée — sert à pré-remplir le modal cotiser. */
  categoryId: string | null;
}

export interface SavingsGoalContribution {
  id: string;
  amount: number;
  date: Date;
  note: string | null;
}

@Injectable()
export class SavingsGoalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Renvoie l'objectif actif (ou null si pas encore créé) avec progression. */
  async getMine(userId: string): Promise<SavingsGoalWithProgress | null> {
    const goal = await this.prisma.savingsGoal.findUnique({
      where: { userId },
      include: { category: { select: { id: true } } },
    });
    if (!goal) return null;
    const currentAmount = goal.category
      ? await this.sumCategoryExpenses(goal.category.id)
      : 0;
    const { category, ...rest } = goal;
    return {
      ...rest,
      currentAmount,
      categoryId: category?.id ?? null,
    };
  }

  async create(
    userId: string,
    dto: CreateSavingsGoalDto,
  ): Promise<SavingsGoalWithProgress> {
    const existing = await this.prisma.savingsGoal.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException(
        "Un objectif existe déjà — supprime-le ou modifie-le avant d'en créer un nouveau.",
      );
    }
    if (dto.deadline.getTime() <= Date.now()) {
      throw new BadRequestException('La date butoir doit être dans le futur.');
    }
    if (dto.dailyAmount > dto.targetAmount) {
      throw new BadRequestException(
        "Le montant quotidien ne peut pas dépasser l'objectif total.",
      );
    }
    const name = dto.name.trim();
    await this.assertNoCategoryNameCollision(userId, name);

    const goal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.savingsGoal.create({
        data: {
          userId,
          name,
          targetAmount: dto.targetAmount,
          dailyAmount: dto.dailyAmount,
          deadline: dto.deadline,
        },
      });
      await tx.expenseCategory.create({
        data: {
          userId,
          name,
          kind: 'SAVINGS',
          system: true,
          savingsGoalId: created.id,
        },
      });
      return created;
    });

    return {
      ...goal,
      currentAmount: 0,
      categoryId:
        (
          await this.prisma.expenseCategory.findUnique({
            where: { savingsGoalId: goal.id },
            select: { id: true },
          })
        )?.id ?? null,
    };
  }

  async update(
    userId: string,
    dto: UpdateSavingsGoalDto,
  ): Promise<SavingsGoalWithProgress> {
    const existing = await this.prisma.savingsGoal.findUnique({
      where: { userId },
      include: { category: { select: { id: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Aucun objectif à modifier.');
    }
    if (existing.isCompleted) {
      throw new BadRequestException(
        'Cet objectif est déjà atteint — il ne peut plus être modifié.',
      );
    }

    const newName = dto.name?.trim();
    const newTarget = dto.targetAmount ?? existing.targetAmount;
    const newDaily = dto.dailyAmount ?? existing.dailyAmount;
    if (newDaily > newTarget) {
      throw new BadRequestException(
        "Le montant quotidien ne peut pas dépasser l'objectif total.",
      );
    }
    if (dto.targetAmount !== undefined) {
      const currentAmount = existing.category
        ? await this.sumCategoryExpenses(existing.category.id)
        : 0;
      if (newTarget < currentAmount) {
        throw new BadRequestException(
          'Le nouvel objectif ne peut pas être inférieur au montant déjà épargné.',
        );
      }
    }
    if (dto.deadline && dto.deadline.getTime() <= Date.now()) {
      throw new BadRequestException('La date butoir doit être dans le futur.');
    }

    await this.prisma.$transaction(async (tx) => {
      // Renommage de la catégorie SAVINGS si le nom change.
      if (newName !== undefined && newName !== existing.name) {
        await this.assertNoCategoryNameCollision(userId, newName, tx);
        await tx.expenseCategory.updateMany({
          where: { savingsGoalId: existing.id },
          data: { name: newName },
        });
      }
      await tx.savingsGoal.update({
        where: { userId },
        data: {
          ...(newName !== undefined ? { name: newName } : {}),
          ...(dto.targetAmount !== undefined
            ? { targetAmount: dto.targetAmount }
            : {}),
          ...(dto.dailyAmount !== undefined
            ? { dailyAmount: dto.dailyAmount }
            : {}),
          ...(dto.deadline !== undefined ? { deadline: dto.deadline } : {}),
        },
      });
    });

    return (await this.getMine(userId))!;
  }

  async remove(userId: string) {
    const existing = await this.prisma.savingsGoal.findUnique({
      where: { userId },
    });
    if (!existing) return;
    // FK onDelete: Cascade supprime la catégorie SAVINGS liée. Les Transaction
    // expense liées passent en expenseCategoryId NULL (SetNull).
    await this.prisma.savingsGoal.delete({ where: { userId } });
  }

  /** Liste les Transactions contribuant à l'objectif (tri date desc). */
  async listContributions(userId: string): Promise<SavingsGoalContribution[]> {
    const goal = await this.prisma.savingsGoal.findUnique({
      where: { userId },
      include: { category: { select: { id: true } } },
    });
    if (!goal || !goal.category) return [];

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        expenseCategoryId: goal.category.id,
      },
      orderBy: { date: 'desc' },
      take: 100,
      select: { id: true, amount: true, date: true, note: true },
    });
    return transactions;
  }

  // --- Helpers ---------------------------------------------------------------

  private async sumCategoryExpenses(categoryId: string): Promise<number> {
    const agg = await this.prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        expenseCategoryId: categoryId,
      },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  private async assertNoCategoryNameCollision(
    userId: string,
    name: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const existing = await client.expenseCategory.findFirst({
      where: { userId, name, NOT: { kind: 'SAVINGS' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `Tu as déjà une catégorie « ${name} ». Renomme-la ou choisis un autre nom.`,
      );
    }
  }
}
