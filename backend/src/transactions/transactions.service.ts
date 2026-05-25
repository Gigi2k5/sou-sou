import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TxType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import {
  ListTransactionsDto,
  SummaryQueryDto,
} from './dto/list-transactions.dto';
import { TransactionHooksService } from './transaction-hooks.service';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const txWithRelations = {
  incomeSource: { select: { id: true, name: true } },
  expenseCategory: { select: { id: true, name: true, kind: true } },
} satisfies Prisma.TransactionInclude;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hooks: TransactionHooksService,
  ) {}

  async list(userId: string, query: ListTransactionsDto) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: txWithRelations,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      pageCount: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async create(userId: string, dto: CreateTransactionDto) {
    await this.validateRefs(userId, dto.type, {
      incomeSourceId: dto.incomeSourceId,
      expenseCategoryId: dto.expenseCategoryId,
    });

    const tx = await this.prisma.transaction.create({
      data: {
        userId,
        type: dto.type,
        amount: dto.amount,
        date: dto.date,
        note: dto.note?.trim() || null,
        incomeSourceId:
          dto.type === TxType.INCOME ? (dto.incomeSourceId ?? null) : null,
        expenseCategoryId:
          dto.type === TxType.EXPENSE ? (dto.expenseCategoryId ?? null) : null,
      },
      include: txWithRelations,
    });

    // Hook : si la catégorie est SAVINGS / POT, met à jour progression,
    // gamification, badges, avatars, et envoie les notifs adéquates.
    // Si FREE + EXPENSE : déclenche la vérification de budget.
    await this.hooks.onCreated(
      userId,
      tx.id,
      tx.expenseCategoryId,
      tx.amount,
      tx.date,
      tx.type,
    );

    return tx;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.assertOwned(userId, id);

    // Si on change la source/catégorie, valider qu'elle appartient à l'user et matche le type
    if (
      dto.incomeSourceId !== undefined ||
      dto.expenseCategoryId !== undefined
    ) {
      await this.validateRefs(userId, existing.type, {
        incomeSourceId:
          dto.incomeSourceId !== undefined
            ? dto.incomeSourceId
            : (existing.incomeSourceId ?? undefined),
        expenseCategoryId:
          dto.expenseCategoryId !== undefined
            ? dto.expenseCategoryId
            : (existing.expenseCategoryId ?? undefined),
      });
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.date !== undefined ? { date: dto.date } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        ...(dto.incomeSourceId !== undefined
          ? {
              incomeSourceId:
                existing.type === TxType.INCOME ? dto.incomeSourceId : null,
            }
          : {}),
        ...(dto.expenseCategoryId !== undefined
          ? {
              expenseCategoryId:
                existing.type === TxType.EXPENSE ? dto.expenseCategoryId : null,
            }
          : {}),
      },
      include: txWithRelations,
    });

    // Hook : reévalue la complétion du pot/goal sur l'ancienne ET la nouvelle
    // catégorie (si l'user a déplacé la transaction d'une cat. système à
    // l'autre, les deux peuvent basculer).
    await this.hooks.onUpdated(
      userId,
      existing.expenseCategoryId,
      updated.expenseCategoryId,
    );

    return updated;
  }

  async remove(userId: string, id: string) {
    const existing = await this.assertOwned(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
    await this.hooks.onRemoved(userId, existing.expenseCategoryId);
  }

  async summary(userId: string, query: SummaryQueryDto) {
    const dateFilter: Prisma.TransactionWhereInput['date'] =
      query.from || query.to
        ? {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          }
        : undefined;

    const baseWhere: Prisma.TransactionWhereInput = {
      userId,
      ...(dateFilter ? { date: dateFilter } : {}),
    };

    const [incomeAgg, expenseAgg, bySource, byCategory, sources, categories] =
      await Promise.all([
        this.prisma.transaction.aggregate({
          where: { ...baseWhere, type: TxType.INCOME },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { ...baseWhere, type: TxType.EXPENSE },
          _sum: { amount: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['incomeSourceId'],
          where: { ...baseWhere, type: TxType.INCOME },
          _sum: { amount: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['expenseCategoryId'],
          where: { ...baseWhere, type: TxType.EXPENSE },
          _sum: { amount: true },
        }),
        this.prisma.incomeSource.findMany({
          where: { userId },
          select: { id: true, name: true },
        }),
        this.prisma.expenseCategory.findMany({
          where: { userId },
          select: { id: true, name: true },
        }),
      ]);

    const sourcesById = new Map(sources.map((s) => [s.id, s.name]));
    const categoriesById = new Map(categories.map((c) => [c.id, c.name]));

    const totalIncome = incomeAgg._sum.amount ?? 0;
    const totalExpense = expenseAgg._sum.amount ?? 0;

    return {
      range: { from: query.from ?? null, to: query.to ?? null },
      income: {
        total: totalIncome,
        bySource: bySource.map((row) => ({
          id: row.incomeSourceId,
          name: row.incomeSourceId
            ? (sourcesById.get(row.incomeSourceId) ?? '(supprimée)')
            : '(non catégorisé)',
          total: row._sum.amount ?? 0,
        })),
      },
      expense: {
        total: totalExpense,
        byCategory: byCategory.map((row) => ({
          id: row.expenseCategoryId,
          name: row.expenseCategoryId
            ? (categoriesById.get(row.expenseCategoryId) ?? '(supprimée)')
            : '(non catégorisé)',
          total: row._sum.amount ?? 0,
        })),
      },
      balance: totalIncome - totalExpense,
    };
  }

  private async assertOwned(userId: string, id: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.userId !== userId) {
      throw new NotFoundException('Transaction introuvable.');
    }
    return tx;
  }

  private async validateRefs(
    userId: string,
    type: TxType,
    refs: { incomeSourceId?: string; expenseCategoryId?: string },
  ) {
    if (type === TxType.INCOME) {
      if (refs.expenseCategoryId) {
        throw new BadRequestException(
          'Une transaction INCOME ne peut pas avoir de catégorie de dépense.',
        );
      }
      if (refs.incomeSourceId) {
        const src = await this.prisma.incomeSource.findUnique({
          where: { id: refs.incomeSourceId },
          select: { userId: true },
        });
        if (!src || src.userId !== userId) {
          throw new BadRequestException('Source de revenu introuvable.');
        }
      }
    } else {
      if (refs.incomeSourceId) {
        throw new BadRequestException(
          'Une transaction EXPENSE ne peut pas avoir de source de revenu.',
        );
      }
      if (refs.expenseCategoryId) {
        const cat = await this.prisma.expenseCategory.findUnique({
          where: { id: refs.expenseCategoryId },
          select: { userId: true },
        });
        if (!cat || cat.userId !== userId) {
          throw new BadRequestException('Catégorie introuvable.');
        }
      }
    }
  }
}
