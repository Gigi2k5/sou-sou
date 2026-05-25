import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Role } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLogService } from './admin-log.service';
import {
  ListAdminUsersDto,
  SortOrder,
  UserSortBy,
  UserStatusFilter,
} from './dto/list-admin-users.dto';

const DAY_MS = 86_400_000;
const INACTIVE_THRESHOLD_DAYS = 30;

export type AdminUserStatus = 'active' | 'inactive' | 'banned';

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  currency: string;
  totalPoints: number;
  isBanned: boolean;
  bannedAt: Date | null;
  banReason: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  status: AdminUserStatus;
}

export interface AdminUserDetailStats {
  totalTransactions: number;
  totalContributions: number;
  totalSavings: number;
  totalArticles: number;
  badgesUnlocked: number;
  avatarsUnlocked: number;
  currentStreak: number;
  bestStreak: number;
  ownedMoneyPotsCount: number;
  moneyPotMembershipsCount: number;
}

export interface AdminUserActivityEntry {
  type:
    | 'TRANSACTION_INCOME'
    | 'TRANSACTION_EXPENSE'
    | 'ARTICLE'
    | 'AVATAR_UNLOCK'
    | 'BADGE_UNLOCK'
    | 'POT_CREATED'
    | 'POT_JOINED';
  date: Date;
  label: string;
}

export interface AdminUserDetail {
  user: AdminUserListItem;
  stats: AdminUserDetailStats;
  recentActivity: AdminUserActivityEntry[];
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLog: AdminLogService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    query: ListAdminUsersDto,
  ): Promise<{
    items: AdminUserListItem[];
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  }> {
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query.sortBy, query.order);

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          currency: true,
          totalPoints: true,
          isBanned: true,
          bannedAt: true,
          banReason: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({ ...u, status: this.computeStatus(u) })),
      total,
      page: query.page,
      limit: query.limit,
      pageCount: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getDetail(id: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        currency: true,
        totalPoints: true,
        currentStreak: true,
        bestStreak: true,
        isBanned: true,
        bannedAt: true,
        banReason: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const [
      totalTransactions,
      contributionsAgg,
      savingsAgg,
      totalArticles,
      badgesUnlocked,
      avatarsUnlocked,
      ownedMoneyPotsCount,
      moneyPotMembershipsCount,
      recentTransactions,
      recentArticles,
      recentAvatarUnlocks,
      recentBadges,
      recentOwnedPots,
      recentMemberships,
    ] = await Promise.all([
      this.prisma.transaction.count({ where: { userId: id } }),
      this.prisma.transaction.aggregate({
        where: {
          userId: id,
          type: 'EXPENSE',
          expenseCategory: { kind: { in: ['SAVINGS', 'POT'] } },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId: id,
          type: 'EXPENSE',
          expenseCategory: { kind: 'SAVINGS' },
        },
        _sum: { amount: true },
      }),
      this.prisma.article.count({ where: { authorId: id } }),
      this.prisma.userBadge.count({ where: { userId: id } }),
      this.prisma.avatarUnlock.count({ where: { userId: id } }),
      this.prisma.moneyPot.count({ where: { ownerId: id } }),
      this.prisma.moneyPotMember.count({ where: { userId: id } }),
      this.prisma.transaction.findMany({
        where: { userId: id },
        orderBy: { date: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          amount: true,
          date: true,
          expenseCategory: { select: { name: true } },
          incomeSource: { select: { name: true } },
        },
      }),
      this.prisma.article.findMany({
        where: { authorId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, createdAt: true },
      }),
      this.prisma.avatarUnlock.findMany({
        where: { userId: id, NOT: { avatarKey: 'pig-green' } },
        orderBy: { unlockedAt: 'desc' },
        take: 5,
        select: { avatarKey: true, unlockedAt: true },
      }),
      this.prisma.userBadge.findMany({
        where: { userId: id },
        orderBy: { unlockedAt: 'desc' },
        take: 5,
        include: { badge: { select: { name: true } } },
      }),
      this.prisma.moneyPot.findMany({
        where: { ownerId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, createdAt: true },
      }),
      this.prisma.moneyPotMember.findMany({
        where: { userId: id, moneyPot: { ownerId: { not: id } } },
        orderBy: { joinedAt: 'desc' },
        take: 5,
        include: { moneyPot: { select: { name: true } } },
      }),
    ]);

    const baseUser: AdminUserListItem = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      currency: user.currency,
      totalPoints: user.totalPoints,
      isBanned: user.isBanned,
      bannedAt: user.bannedAt,
      banReason: user.banReason,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      status: this.computeStatus(user),
    };

    // Synthèse de la timeline (cf. Q9 — pas de table dédiée).
    const activity: AdminUserActivityEntry[] = [
      ...recentTransactions.map((t) => ({
        type:
          t.type === 'INCOME'
            ? ('TRANSACTION_INCOME' as const)
            : ('TRANSACTION_EXPENSE' as const),
        date: t.date,
        label:
          t.type === 'INCOME'
            ? `Revenu : ${t.incomeSource?.name ?? 'sans source'}`
            : `Dépense : ${t.expenseCategory?.name ?? 'sans catégorie'}`,
      })),
      ...recentArticles.map((a) => ({
        type: 'ARTICLE' as const,
        date: a.createdAt,
        label: `Publication : « ${a.title} »`,
      })),
      ...recentAvatarUnlocks.map((u) => ({
        type: 'AVATAR_UNLOCK' as const,
        date: u.unlockedAt,
        label: `Avatar débloqué : ${u.avatarKey}`,
      })),
      ...recentBadges.map((b) => ({
        type: 'BADGE_UNLOCK' as const,
        date: b.unlockedAt,
        label: `Badge débloqué : ${b.badge.name}`,
      })),
      ...recentOwnedPots.map((p) => ({
        type: 'POT_CREATED' as const,
        date: p.createdAt,
        label: `Pot créé : « ${p.name} »`,
      })),
      ...recentMemberships.map((m) => ({
        type: 'POT_JOINED' as const,
        date: m.joinedAt,
        label: `Pot rejoint : « ${m.moneyPot.name} »`,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 20);

    return {
      user: baseUser,
      stats: {
        totalTransactions,
        totalContributions: contributionsAgg._sum.amount ?? 0,
        totalSavings: savingsAgg._sum.amount ?? 0,
        totalArticles,
        badgesUnlocked,
        avatarsUnlocked,
        currentStreak: user.currentStreak,
        bestStreak: user.bestStreak,
        ownedMoneyPotsCount,
        moneyPotMembershipsCount,
      },
      recentActivity: activity,
    };
  }

  async ban(adminId: string, targetUserId: string, reason: string) {
    if (adminId === targetUserId) {
      throw new BadRequestException('Tu ne peux pas te bannir toi-même.');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isBanned: true, name: true },
    });
    if (!target) throw new NotFoundException('Utilisateur introuvable.');
    if (target.isBanned) {
      throw new ConflictException('Cet utilisateur est déjà banni.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          isBanned: true,
          banReason: reason,
          bannedAt: new Date(),
          bannedBy: adminId,
        },
      });
      // Révoque tous les RefreshTokens actifs → empêche un re-login silencieux.
      // Le check `isBanned` dans JwtStrategy.validate() invalide aussi
      // l'access token actuel à la prochaine requête.
      await tx.refreshToken.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.adminLog.record(
        {
          adminId,
          action: 'BAN_USER',
          targetType: 'User',
          targetId: targetUserId,
          details: { reason },
        },
        tx,
      );
    });

    // Notif au user banni (il la verra à la prochaine connexion ou si tout
    // de suite l'apprendra par autre canal — sa session est de toute façon
    // immédiatement HS).
    await this.notifications.create({
      userId: targetUserId,
      type: 'ADMIN_WARNING',
      title: 'Compte suspendu',
      body: `Ton compte a été suspendu par un administrateur. Raison : ${reason}`,
      data: { reason },
    });
  }

  async unban(adminId: string, targetUserId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isBanned: true },
    });
    if (!target) throw new NotFoundException('Utilisateur introuvable.');
    if (!target.isBanned) {
      throw new ConflictException("Cet utilisateur n'est pas banni.");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          isBanned: false,
          banReason: null,
          bannedAt: null,
          bannedBy: null,
        },
      });
      await this.adminLog.record(
        {
          adminId,
          action: 'UNBAN_USER',
          targetType: 'User',
          targetId: targetUserId,
        },
        tx,
      );
    });
  }

  async updateRole(adminId: string, targetUserId: string, newRole: Role) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, isBanned: true },
    });
    if (!target) throw new NotFoundException('Utilisateur introuvable.');
    if (target.role === newRole) {
      throw new ConflictException("L'utilisateur a déjà ce rôle.");
    }
    if (newRole === 'USER' && target.role === 'ADMIN') {
      const otherAdmins = await this.prisma.user.count({
        where: {
          role: 'ADMIN',
          isBanned: false,
          id: { not: targetUserId },
        },
      });
      if (otherAdmins === 0) {
        throw new ForbiddenException(
          'Impossible de rétrograder le dernier administrateur actif.',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
      });
      await this.adminLog.record(
        {
          adminId,
          action: newRole === 'ADMIN' ? 'PROMOTE_ROLE' : 'DEMOTE_ROLE',
          targetType: 'User',
          targetId: targetUserId,
          details: { from: target.role, to: newRole },
        },
        tx,
      );
    });

    await this.notifications.create({
      userId: targetUserId,
      type: 'ADMIN_WARNING',
      title:
        newRole === 'ADMIN'
          ? 'Promotion administrateur'
          : 'Changement de rôle',
      body:
        newRole === 'ADMIN'
          ? "Tu es maintenant administrateur de Sou'Sou."
          : "Ton rôle administrateur a été retiré.",
      data: { from: target.role, to: newRole },
    });
  }

  async remove(adminId: string, targetUserId: string, confirmEmail: string) {
    if (adminId === targetUserId) {
      throw new BadRequestException(
        'Tu ne peux pas supprimer ton propre compte depuis l\'admin.',
      );
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('Utilisateur introuvable.');
    if (target.email.toLowerCase() !== confirmEmail.toLowerCase()) {
      throw new BadRequestException(
        "L'email de confirmation ne correspond pas.",
      );
    }
    if (target.role === 'ADMIN') {
      const otherAdmins = await this.prisma.user.count({
        where: {
          role: 'ADMIN',
          isBanned: false,
          id: { not: targetUserId },
        },
      });
      if (otherAdmins === 0) {
        throw new ForbiddenException(
          'Impossible de supprimer le dernier administrateur actif.',
        );
      }
    }

    // Pots groupe actifs avec d'autres membres : on bloque (cf. Q7 hybride).
    const ownedActivePots = await this.prisma.moneyPot.findMany({
      where: { ownerId: targetUserId, isGroup: true, isCompleted: false },
      include: { _count: { select: { members: true } } },
    });
    const blocking = ownedActivePots.filter((p) => p._count.members > 1);
    if (blocking.length > 0) {
      throw new ConflictException(
        `Suppression impossible : ${target.name} est créateur de ${blocking.length} pot(s) groupe actif(s) avec d'autres membres (« ${blocking[0].name} »). Demande-lui de transférer ou supprimer ces pots avant.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Pots solo + groupes "vides" (cascade supprime MoneyPotMember,
      //    catégories POT, et SetNull les Transaction liées).
      await tx.moneyPot.deleteMany({ where: { ownerId: targetUserId } });
      // 2. Objectif d'épargne (cascade catégorie SAVINGS + Transaction).
      await tx.savingsGoal.deleteMany({ where: { userId: targetUserId } });
      // 3. Catégories de dépenses libres (cascade les Transaction privées).
      await tx.expenseCategory.deleteMany({
        where: { userId: targetUserId, kind: 'FREE' },
      });
      // 4. Sources de revenu (cascade les Transaction INCOME).
      await tx.incomeSource.deleteMany({ where: { userId: targetUserId } });
      // 5. Reste à scrubber : Transactions orphelines (catégorie/source NULL).
      //    Les Transactions liées à des catégories POT *d'autres pots* (où
      //    l'user était membre) sont préservées pour ne pas amputer les pots
      //    des autres membres.
      await tx.transaction.deleteMany({
        where: {
          userId: targetUserId,
          expenseCategoryId: null,
          incomeSourceId: null,
        },
      });
      // 6. Données purement privées.
      await tx.avatarUnlock.deleteMany({ where: { userId: targetUserId } });
      await tx.userBadge.deleteMany({ where: { userId: targetUserId } });
      await tx.notification.deleteMany({ where: { userId: targetUserId } });
      await tx.refreshToken.deleteMany({ where: { userId: targetUserId } });
      // 7. Soft-delete : scrub PII, ban pour empêcher tout re-login.
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          email: `deleted-${targetUserId}@anonymized.local`,
          name: 'Compte supprimé',
          password: '',
          avatarUrl: null,
          totalPoints: 0,
          currentStreak: 0,
          bestStreak: 0,
          lastContributionAt: null,
          lastLoginAt: null,
          isBanned: true,
          banReason: 'Compte supprimé',
          bannedAt: new Date(),
          bannedBy: adminId,
          resetToken: null,
          resetTokenExpiresAt: null,
        },
      });
      // 8. AdminLog (avant scrub serait perdu si on attendait).
      await this.adminLog.record(
        {
          adminId,
          action: 'DELETE_USER',
          targetType: 'User',
          targetId: targetUserId,
          details: { email: target.email, name: target.name },
        },
        tx,
      );
    });
  }

  // --- Helpers ---------------------------------------------------------------

  private buildWhere(query: ListAdminUsersDto): Prisma.UserWhereInput {
    const conditions: Prisma.UserWhereInput[] = [];

    // On exclut les comptes déjà supprimés (anonymisés via soft-delete).
    conditions.push({ email: { not: { startsWith: 'deleted-' } } });

    if (query.search) {
      conditions.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.currency) {
      conditions.push({ currency: query.currency });
    }
    if (query.status === UserStatusFilter.BANNED) {
      conditions.push({ isBanned: true });
    } else if (query.status === UserStatusFilter.ACTIVE) {
      conditions.push({
        isBanned: false,
        lastLoginAt: {
          gte: new Date(Date.now() - INACTIVE_THRESHOLD_DAYS * DAY_MS),
        },
      });
    } else if (query.status === UserStatusFilter.INACTIVE) {
      conditions.push({
        isBanned: false,
        OR: [
          { lastLoginAt: null },
          {
            lastLoginAt: {
              lt: new Date(Date.now() - INACTIVE_THRESHOLD_DAYS * DAY_MS),
            },
          },
        ],
      });
    }
    return { AND: conditions };
  }

  private buildOrderBy(
    sortBy: UserSortBy,
    order: SortOrder,
  ): Prisma.UserOrderByWithRelationInput {
    const dir = order === SortOrder.ASC ? 'asc' : 'desc';
    switch (sortBy) {
      case UserSortBy.NAME:
        return { name: dir };
      case UserSortBy.LAST_LOGIN_AT:
        return { lastLoginAt: { sort: dir, nulls: 'last' } };
      case UserSortBy.TOTAL_POINTS:
        return { totalPoints: dir };
      case UserSortBy.CREATED_AT:
      default:
        return { createdAt: dir };
    }
  }

  private computeStatus(u: {
    isBanned: boolean;
    lastLoginAt: Date | null;
  }): AdminUserStatus {
    if (u.isBanned) return 'banned';
    if (
      !u.lastLoginAt ||
      Date.now() - u.lastLoginAt.getTime() >
        INACTIVE_THRESHOLD_DAYS * DAY_MS
    ) {
      return 'inactive';
    }
    return 'active';
  }
}
