import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { userId },
      orderBy: [{ system: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        kind: true,
        system: true,
        moneyPotId: true,
        savingsGoalId: true,
        createdAt: true,
      },
    });
  }

  async create(userId: string, dto: CreateExpenseCategoryDto) {
    try {
      return await this.prisma.expenseCategory.create({
        data: { userId, name: dto.name.trim() },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Cette catégorie existe déjà.');
      }
      throw err;
    }
  }

  async update(userId: string, id: string, dto: UpdateExpenseCategoryDto) {
    await this.assertOwnedAndEditable(userId, id);
    try {
      return await this.prisma.expenseCategory.update({
        where: { id },
        data: { name: dto.name.trim() },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Une catégorie avec ce nom existe déjà.');
      }
      throw err;
    }
  }

  async remove(userId: string, id: string) {
    await this.assertOwnedAndEditable(userId, id);
    await this.prisma.expenseCategory.delete({ where: { id } });
  }

  /**
   * Lève si la catégorie n'appartient pas à l'user, ou si c'est une catégorie
   * système (kind SAVINGS/POT) — ces catégories sont gérées par le pot ou
   * l'objectif d'épargne, l'user ne doit pas les modifier directement.
   */
  private async assertOwnedAndEditable(userId: string, id: string) {
    const cat = await this.prisma.expenseCategory.findUnique({
      where: { id },
      select: { userId: true, system: true },
    });
    if (!cat || cat.userId !== userId) {
      throw new NotFoundException('Catégorie introuvable.');
    }
    if (cat.system) {
      throw new BadRequestException(
        "Cette catégorie est gérée automatiquement (épargne ou pot) — modifie le pot ou l'objectif lié.",
      );
    }
  }
}
