import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MoneyPot, Prisma } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMoneyPotDto } from './dto/create-money-pot.dto';
import { JoinMoneyPotDto } from './dto/join-money-pot.dto';
import { UpdateMoneyPotDto } from './dto/update-money-pot.dto';
import { generateUniqueInviteCode, normalizeInviteCode } from './invite-code';

export interface MoneyPotMemberLite {
  userId: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: Date;
  totalContributed: number;
  isMe: boolean;
}

export interface MoneyPotSummary {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
  isCompleted: boolean;
  completedAt: Date | null;
  isGroup: boolean;
  /** null si pas le owner (ne devrait pas voir le code), sinon le code. */
  inviteCode: string | null;
  ownerId: string;
  membersCount: number;
  myTotalContributed: number;
  createdAt: Date;
}

export interface MoneyPotDetail extends MoneyPotSummary {
  owner: { id: string; name: string; avatarUrl: string | null };
  members: MoneyPotMemberLite[];
  /** ID de la catégorie système liée au user courant — l'UI s'en sert pour
   *  pré-remplir le modal "Cotiser" qui crée une Transaction expense. */
  myCategoryId: string;
}

export interface MoneyPotContributionLite {
  id: string;
  amount: number;
  note: string | null;
  date: Date;
  user: { id: string; name: string; avatarUrl: string | null };
}

@Injectable()
export class MoneyPotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- Création / lecture / update / suppression ----------------------------

  async create(ownerId: string, dto: CreateMoneyPotDto): Promise<MoneyPot> {
    if (dto.deadline && dto.deadline.getTime() <= Date.now()) {
      throw new BadRequestException('La date limite doit être dans le futur.');
    }
    const name = dto.name.trim();

    await this.assertNoCategoryNameCollision(ownerId, name);

    const inviteCode = dto.isGroup
      ? await generateUniqueInviteCode(async (code) => {
          const found = await this.prisma.moneyPot.findUnique({
            where: { inviteCode: code },
            select: { id: true },
          });
          return !!found;
        })
      : null;

    return this.prisma.$transaction(async (tx) => {
      const pot = await tx.moneyPot.create({
        data: {
          ownerId,
          name,
          description: dto.description?.trim() || null,
          targetAmount: dto.targetAmount,
          deadline: dto.deadline ?? null,
          isGroup: !!dto.isGroup,
          inviteCode,
        },
      });
      // Owner devient automatiquement membre (groupe ET solo).
      await tx.moneyPotMember.create({
        data: { moneyPotId: pot.id, userId: ownerId },
      });
      await this.createMemberCategory(tx, pot, ownerId);
      return pot;
    });
  }

  /** Liste les pots où l'user est membre (ordre : plus récent d'abord). */
  async listMine(userId: string): Promise<MoneyPotSummary[]> {
    const memberships = await this.prisma.moneyPotMember.findMany({
      where: { userId },
      select: { moneyPotId: true },
    });
    if (memberships.length === 0) return [];
    const potIds = memberships.map((m) => m.moneyPotId);

    const pots = await this.prisma.moneyPot.findMany({
      where: { id: { in: potIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true } },
        categories: { select: { id: true, userId: true } },
      },
    });

    const sumByCategoryId = await this.sumExpensesByCategory(
      pots.flatMap((p) => p.categories.map((c) => c.id)),
    );

    return pots.map((p) => {
      const currentAmount = p.categories.reduce(
        (acc, c) => acc + (sumByCategoryId.get(c.id) ?? 0),
        0,
      );
      const myCat = p.categories.find((c) => c.userId === userId);
      const myTotalContributed = myCat
        ? (sumByCategoryId.get(myCat.id) ?? 0)
        : 0;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        targetAmount: p.targetAmount,
        currentAmount,
        deadline: p.deadline,
        isCompleted: p.isCompleted,
        completedAt: p.completedAt,
        isGroup: p.isGroup,
        inviteCode: p.ownerId === userId ? p.inviteCode : null,
        ownerId: p.ownerId,
        membersCount: p._count.members,
        myTotalContributed,
        createdAt: p.createdAt,
      };
    });
  }

  async getDetail(userId: string, potId: string): Promise<MoneyPotDetail> {
    const pot = await this.prisma.moneyPot.findUnique({
      where: { id: potId },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        categories: { select: { id: true, userId: true } },
      },
    });
    if (!pot) throw new NotFoundException('Cotisation introuvable.');
    const isMember = pot.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException("Tu n'es pas membre de cette cotisation.");
    }
    const myCategory = pot.categories.find((c) => c.userId === userId);
    if (!myCategory) {
      // Filet de sécurité — un membre devrait toujours avoir une catégorie liée.
      throw new ForbiddenException(
        'Catégorie manquante pour ce pot — contacte le support.',
      );
    }

    const sumByCategoryId = await this.sumExpensesByCategory(
      pot.categories.map((c) => c.id),
    );
    const totalsByUser = new Map<string, number>();
    for (const c of pot.categories) {
      totalsByUser.set(c.userId, sumByCategoryId.get(c.id) ?? 0);
    }
    const currentAmount = pot.categories.reduce(
      (acc, c) => acc + (sumByCategoryId.get(c.id) ?? 0),
      0,
    );

    const members: MoneyPotMemberLite[] = pot.members
      .map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        joinedAt: m.joinedAt,
        totalContributed: totalsByUser.get(m.user.id) ?? 0,
        isMe: m.user.id === userId,
      }))
      // Mini-leaderboard : trié par contribution descendante.
      .sort((a, b) => b.totalContributed - a.totalContributed);

    return {
      id: pot.id,
      name: pot.name,
      description: pot.description,
      targetAmount: pot.targetAmount,
      currentAmount,
      deadline: pot.deadline,
      isCompleted: pot.isCompleted,
      completedAt: pot.completedAt,
      isGroup: pot.isGroup,
      inviteCode: pot.ownerId === userId ? pot.inviteCode : null,
      ownerId: pot.ownerId,
      membersCount: pot.members.length,
      myTotalContributed: totalsByUser.get(userId) ?? 0,
      createdAt: pot.createdAt,
      owner: pot.owner,
      members,
      myCategoryId: myCategory.id,
    };
  }

  async update(userId: string, potId: string, dto: UpdateMoneyPotDto) {
    const pot = await this.assertOwner(userId, potId);
    if (pot.isCompleted) {
      throw new BadRequestException(
        'Cotisation déjà atteinte — elle ne peut plus être modifiée.',
      );
    }
    const newName = dto.name?.trim();
    const newTarget = dto.targetAmount ?? pot.targetAmount;

    if (dto.targetAmount !== undefined) {
      const currentAmount = await this.computeCurrentAmount(potId);
      if (newTarget < currentAmount) {
        throw new BadRequestException(
          'Le nouvel objectif ne peut pas être inférieur à ce qui a déjà été cotisé.',
        );
      }
    }
    if (dto.deadline && dto.deadline.getTime() <= Date.now()) {
      throw new BadRequestException('La date limite doit être dans le futur.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Renommage des catégories liées si le nom change.
      if (newName !== undefined && newName !== pot.name) {
        await this.assertNoMemberCategoryCollision(tx, potId, newName);
        await tx.expenseCategory.updateMany({
          where: { moneyPotId: potId },
          data: { name: newName },
        });
      }

      return tx.moneyPot.update({
        where: { id: potId },
        data: {
          ...(newName !== undefined ? { name: newName } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          ...(dto.targetAmount !== undefined
            ? { targetAmount: dto.targetAmount }
            : {}),
          ...(dto.deadline !== undefined ? { deadline: dto.deadline } : {}),
        },
      });
    });
  }

  async remove(userId: string, potId: string) {
    await this.assertOwner(userId, potId);
    // FK onDelete: Cascade supprime les MoneyPotMember + ExpenseCategory liées.
    // Les Transaction expense liées passent en expenseCategoryId=NULL (SetNull).
    await this.prisma.moneyPot.delete({ where: { id: potId } });
  }

  // --- Membres ---------------------------------------------------------------

  async join(userId: string, dto: JoinMoneyPotDto): Promise<MoneyPot> {
    const code = normalizeInviteCode(dto.inviteCode);
    if (!code) {
      throw new BadRequestException(
        'Code invalide — 6 caractères, sans I/O/0/1.',
      );
    }
    const pot = await this.prisma.moneyPot.findUnique({
      where: { inviteCode: code },
    });
    if (!pot) throw new NotFoundException('Aucune cotisation pour ce code.');
    if (!pot.isGroup) {
      // Théoriquement impossible (solo n'a pas de code), mais filet de sécurité.
      throw new BadRequestException("Cette cotisation n'est pas en groupe.");
    }
    const existing = await this.prisma.moneyPotMember.findUnique({
      where: {
        moneyPotId_userId: { moneyPotId: pot.id, userId },
      },
    });
    if (existing) {
      throw new ConflictException('Tu fais déjà partie de cette cotisation.');
    }
    await this.assertNoCategoryNameCollision(userId, pot.name);

    await this.prisma.$transaction(async (tx) => {
      await tx.moneyPotMember.create({
        data: { moneyPotId: pot.id, userId },
      });
      await this.createMemberCategory(tx, pot, userId);
    });

    // Notif au owner (sauf s'il s'auto-join — théoriquement impossible).
    if (pot.ownerId !== userId) {
      const newMember = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      await this.notifications.create({
        userId: pot.ownerId,
        type: 'CONTRIBUTION_NEW_MEMBER',
        title: 'Nouveau membre',
        body: `${newMember?.name ?? "Quelqu'un"} a rejoint « ${pot.name} ».`,
        data: { moneyPotId: pot.id, newMemberId: userId },
      });
    }

    return pot;
  }

  async leave(userId: string, potId: string) {
    const pot = await this.prisma.moneyPot.findUnique({
      where: { id: potId },
      select: { ownerId: true, isGroup: true },
    });
    if (!pot) throw new NotFoundException('Cotisation introuvable.');
    if (pot.ownerId === userId) {
      throw new BadRequestException(
        'Tu es le créateur — supprime la cotisation au lieu de la quitter.',
      );
    }
    if (!pot.isGroup) {
      throw new BadRequestException(
        'Une cotisation solo ne se quitte pas — supprime-la.',
      );
    }
    const member = await this.prisma.moneyPotMember.findUnique({
      where: { moneyPotId_userId: { moneyPotId: potId, userId } },
    });
    if (!member) {
      throw new NotFoundException("Tu n'es pas dans cette cotisation.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.moneyPotMember.delete({ where: { id: member.id } });
      // Supprimer la catégorie système → les Transaction passent en
      // expenseCategoryId NULL (SetNull). L'historique financier reste,
      // simplement décategorisé.
      await tx.expenseCategory.deleteMany({
        where: { moneyPotId: potId, userId },
      });
    });
  }

  // --- Historique des contributions -----------------------------------------

  async listContributions(
    userId: string,
    potId: string,
  ): Promise<MoneyPotContributionLite[]> {
    await this.assertMember(userId, potId);
    const cats = await this.prisma.expenseCategory.findMany({
      where: { moneyPotId: potId },
      select: { id: true },
    });
    if (cats.length === 0) return [];

    const transactions = await this.prisma.transaction.findMany({
      where: {
        type: 'EXPENSE',
        expenseCategoryId: { in: cats.map((c) => c.id) },
      },
      orderBy: { date: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    return transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      note: t.note,
      date: t.date,
      user: t.user,
    }));
  }

  // --- Helpers ---------------------------------------------------------------

  /**
   * Crée la catégorie système POT pour un membre du pot.
   * Note : le caller doit avoir vérifié l'absence de collision de nom.
   */
  private async createMemberCategory(
    tx: Prisma.TransactionClient,
    pot: { id: string; name: string },
    userId: string,
  ) {
    await tx.expenseCategory.create({
      data: {
        userId,
        name: pot.name,
        kind: 'POT',
        system: true,
        moneyPotId: pot.id,
      },
    });
  }

  /** Lève si l'user a déjà une catégorie portant ce nom (toutes catégories). */
  private async assertNoCategoryNameCollision(userId: string, name: string) {
    const existing = await this.prisma.expenseCategory.findFirst({
      where: { userId, name },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `Tu as déjà une catégorie « ${name} ». Renomme-la ou choisis un autre nom.`,
      );
    }
  }

  /** Lève si l'un des membres a déjà une catégorie (autre que celle du pot)
   *  qui porterait ce nouveau nom. */
  private async assertNoMemberCategoryCollision(
    tx: Prisma.TransactionClient,
    potId: string,
    newName: string,
  ) {
    const members = await tx.moneyPotMember.findMany({
      where: { moneyPotId: potId },
      select: { userId: true },
    });
    const collision = await tx.expenseCategory.findFirst({
      where: {
        userId: { in: members.map((m) => m.userId) },
        name: newName,
        NOT: { moneyPotId: potId },
      },
      select: { id: true },
    });
    if (collision) {
      throw new ConflictException(
        `Renommage impossible : un membre a déjà une catégorie « ${newName} ».`,
      );
    }
  }

  /** Somme des Transaction.amount expense par expenseCategoryId. */
  private async sumExpensesByCategory(
    categoryIds: string[],
  ): Promise<Map<string, number>> {
    if (categoryIds.length === 0) return new Map();
    const rows = await this.prisma.transaction.groupBy({
      by: ['expenseCategoryId'],
      where: {
        type: 'EXPENSE',
        expenseCategoryId: { in: categoryIds },
      },
      _sum: { amount: true },
    });
    return new Map(
      rows
        .filter((r) => r.expenseCategoryId !== null)
        .map((r) => [r.expenseCategoryId as string, r._sum.amount ?? 0]),
    );
  }

  private async computeCurrentAmount(potId: string): Promise<number> {
    const cats = await this.prisma.expenseCategory.findMany({
      where: { moneyPotId: potId },
      select: { id: true },
    });
    if (cats.length === 0) return 0;
    const agg = await this.prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        expenseCategoryId: { in: cats.map((c) => c.id) },
      },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  private async assertOwner(userId: string, potId: string): Promise<MoneyPot> {
    const pot = await this.prisma.moneyPot.findUnique({ where: { id: potId } });
    if (!pot) throw new NotFoundException('Cotisation introuvable.');
    if (pot.ownerId !== userId) {
      throw new ForbiddenException(
        'Seul le créateur peut effectuer cette action.',
      );
    }
    return pot;
  }

  private async assertMember(userId: string, potId: string) {
    const member = await this.prisma.moneyPotMember.findUnique({
      where: { moneyPotId_userId: { moneyPotId: potId, userId } },
      select: { id: true },
    });
    if (!member) {
      throw new ForbiddenException("Tu n'es pas membre de cette cotisation.");
    }
  }
}

// Re-export pour les consommateurs externes (tests, contrôleurs).
export type { Prisma };
