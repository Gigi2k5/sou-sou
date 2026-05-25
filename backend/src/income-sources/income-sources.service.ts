import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomeSourceDto } from './dto/create-income-source.dto';
import { UpdateIncomeSourceDto } from './dto/update-income-source.dto';

@Injectable()
export class IncomeSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.incomeSource.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateIncomeSourceDto) {
    try {
      return await this.prisma.incomeSource.create({
        data: { userId, name: dto.name.trim() },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Cette source existe déjà.');
      }
      throw err;
    }
  }

  async update(userId: string, id: string, dto: UpdateIncomeSourceDto) {
    await this.assertOwned(userId, id);
    try {
      return await this.prisma.incomeSource.update({
        where: { id },
        data: { name: dto.name.trim() },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Une source avec ce nom existe déjà.');
      }
      throw err;
    }
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.incomeSource.delete({ where: { id } });
  }

  private async assertOwned(userId: string, id: string) {
    const source = await this.prisma.incomeSource.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!source || source.userId !== userId) {
      throw new NotFoundException('Source introuvable.');
    }
  }
}
