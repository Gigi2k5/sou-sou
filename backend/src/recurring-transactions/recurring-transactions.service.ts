import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, TxType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';

@Injectable()
export class RecurringTransactionsService {
  private readonly logger = new Logger(RecurringTransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- CRUD -----------------------------------------------------------------

  list(userId: string) {
    return this.prisma.recurringTransaction.findMany({
      where: { userId },
      include: {
        incomeSource: { select: { id: true, name: true } },
        expenseCategory: { select: { id: true, name: true } },
      },
      orderBy: [{ isActive: 'desc' }, { dayOfMonth: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateRecurringTransactionDto) {
    await this.validateRefs(userId, dto.type, {
      incomeSourceId: dto.incomeSourceId,
      expenseCategoryId: dto.expenseCategoryId,
    });
    return this.prisma.recurringTransaction.create({
      data: {
        userId,
        type: dto.type,
        amount: dto.amount,
        dayOfMonth: dto.dayOfMonth,
        note: dto.note?.trim() || null,
        incomeSourceId:
          dto.type === TxType.INCOME ? (dto.incomeSourceId ?? null) : null,
        expenseCategoryId:
          dto.type === TxType.EXPENSE ? (dto.expenseCategoryId ?? null) : null,
      },
      include: {
        incomeSource: { select: { id: true, name: true } },
        expenseCategory: { select: { id: true, name: true } },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateRecurringTransactionDto) {
    const existing = await this.assertOwned(userId, id);
    if (
      dto.incomeSourceId !== undefined ||
      dto.expenseCategoryId !== undefined
    ) {
      await this.validateRefs(userId, existing.type, {
        incomeSourceId:
          dto.incomeSourceId !== undefined
            ? (dto.incomeSourceId ?? undefined)
            : (existing.incomeSourceId ?? undefined),
        expenseCategoryId:
          dto.expenseCategoryId !== undefined
            ? (dto.expenseCategoryId ?? undefined)
            : (existing.expenseCategoryId ?? undefined),
      });
    }
    return this.prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.dayOfMonth !== undefined ? { dayOfMonth: dto.dayOfMonth } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        ...(dto.incomeSourceId !== undefined
          ? {
              incomeSourceId:
                existing.type === TxType.INCOME
                  ? (dto.incomeSourceId ?? null)
                  : null,
            }
          : {}),
        ...(dto.expenseCategoryId !== undefined
          ? {
              expenseCategoryId:
                existing.type === TxType.EXPENSE
                  ? (dto.expenseCategoryId ?? null)
                  : null,
            }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        incomeSource: { select: { id: true, name: true } },
        expenseCategory: { select: { id: true, name: true } },
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    // Les Transaction matérialisées gardent leur recurringTransactionId à null
    // (onDelete: SetNull) — l'historique reste lisible.
    await this.prisma.recurringTransaction.delete({ where: { id } });
  }

  // --- Cron quotidien à 1h --------------------------------------------------

  /**
   * Matérialise toutes les RecurringTransaction actives qui doivent
   * s'exécuter aujourd'hui :
   *   - dayOfMonth === today.getDate()  → cas standard
   *   - OU dayOfMonth > daysInMonth(today) ET today === lastDayOfMonth(today)
   *     → cas du 31 en février (matérialisé le 28/29).
   * Idempotence : on saute si une Transaction existe déjà ce mois-ci pour
   * cette règle (lookup par recurringTransactionId + date dans le mois courant).
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, { name: 'materialize-recurrences' })
  async materializeForToday(today: Date = new Date()) {
    const day = today.getDate();
    const lastDay = lastDayOfMonth(today);
    const isLastDay = day === lastDay;

    const recurrences = await this.prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        OR: [
          { dayOfMonth: day },
          ...(isLastDay ? [{ dayOfMonth: { gt: lastDay } }] : []),
        ],
      },
    });
    if (recurrences.length === 0) {
      this.logger.log("Aucune récurrence à matérialiser aujourd'hui.");
      return { scheduled: 0, created: 0, skipped: 0 };
    }

    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const existing = await this.prisma.transaction.findMany({
      where: {
        recurringTransactionId: { in: recurrences.map((r) => r.id) },
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { recurringTransactionId: true },
    });
    const alreadyMaterialized = new Set(
      existing
        .map((t) => t.recurringTransactionId)
        .filter((id): id is string => !!id),
    );

    let created = 0;
    let skipped = 0;
    for (const r of recurrences) {
      if (alreadyMaterialized.has(r.id)) {
        skipped++;
        continue;
      }
      await this.prisma.transaction.create({
        data: {
          userId: r.userId,
          type: r.type,
          amount: r.amount,
          // On force la date au jour cible (pas l'heure du cron à 1h, qui
          // pourrait drift quand on relit le mois).
          date: today,
          note: r.note,
          incomeSourceId: r.incomeSourceId,
          expenseCategoryId: r.expenseCategoryId,
          recurringTransactionId: r.id,
        },
      });
      created++;
    }

    this.logger.log(
      `Récurrences : ${created} matérialisée(s), ${skipped} déjà présente(s) ce mois.`,
    );
    return { scheduled: recurrences.length, created, skipped };
  }

  // --- Helpers --------------------------------------------------------------

  private async assertOwned(userId: string, id: string) {
    const r = await this.prisma.recurringTransaction.findUnique({
      where: { id },
    });
    if (!r || r.userId !== userId) {
      throw new NotFoundException('Récurrence introuvable.');
    }
    return r;
  }

  private async validateRefs(
    userId: string,
    type: TxType,
    refs: { incomeSourceId?: string; expenseCategoryId?: string },
  ) {
    if (type === TxType.INCOME) {
      if (refs.expenseCategoryId) {
        throw new BadRequestException(
          'Une récurrence INCOME ne peut pas avoir de catégorie de dépense.',
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
          'Une récurrence EXPENSE ne peut pas avoir de source de revenu.',
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

// --- Date helpers ---
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function lastDayOfMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// Re-export for consumers
export type { Prisma };
