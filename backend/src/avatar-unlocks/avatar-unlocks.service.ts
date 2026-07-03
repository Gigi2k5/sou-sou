import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AVATAR_DEFINITIONS,
  AvatarDefinition,
  DEFAULT_AVATAR_KEY,
  UserStats,
} from './conditions';

export interface AvatarStatus {
  key: string;
  label: string;
  description: string;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  progress: { current: number; target: number } | null;
}

@Injectable()
export class AvatarUnlocksService implements OnModuleInit {
  private readonly logger = new Logger(AvatarUnlocksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Au démarrage : pour chaque user existant, débloquer le cochon par défaut
   * + évaluer toutes les conditions et débloquer ce qui correspond à
   * l'historique. Idempotent (contrainte unique `(userId, avatarKey)`).
   *
   * Les notifs ne sont PAS émises lors de cette synchro initiale (le user
   * n'aurait pas envie de recevoir 5 notifs au boot).
   */
  async onModuleInit() {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    if (users.length === 0) {
      this.logger.log('Aucun user à synchroniser pour les avatars.');
      return;
    }
    let totalNew = 0;
    for (const u of users) {
      const newlyUnlocked = await this.checkAndUnlock(u.id, {
        silent: true,
      });
      totalNew += newlyUnlocked.length;
    }
    this.logger.log(
      `Synchro avatars : ${totalNew} déblocages rétroactifs sur ${users.length} users.`,
    );
  }

  /**
   * Évalue toutes les conditions pour cet user et débloque celles qui sont
   * remplies mais pas encore enregistrées. Renvoie les avatars **nouvellement**
   * débloqués pendant cet appel (utile pour l'UI : modale célébration).
   *
   * Émet une notif `AVATAR_UNLOCKED` par avatar débloqué (sauf si `silent: true`).
   */
  async checkAndUnlock(
    userId: string,
    opts: { silent?: boolean } = {},
  ): Promise<AvatarDefinition[]> {
    const [stats, existing] = await Promise.all([
      this.computeStats(userId),
      this.prisma.avatarUnlock.findMany({
        where: { userId },
        select: { avatarKey: true },
      }),
    ]);
    const existingKeys = new Set(existing.map((e) => e.avatarKey));

    const toUnlock: AvatarDefinition[] = [];
    for (const def of AVATAR_DEFINITIONS) {
      if (existingKeys.has(def.key)) continue;
      const result = def.evaluate(stats);
      if (result.unlocked) toUnlock.push(def);
    }

    if (toUnlock.length === 0) return [];

    await this.prisma.avatarUnlock.createMany({
      data: toUnlock.map((d) => ({ userId, avatarKey: d.key })),
      skipDuplicates: true,
    });

    if (!opts.silent) {
      for (const def of toUnlock) {
        // Le cochon par défaut n'a pas besoin de générer une notif "Bravo" :
        // tout le monde l'a au signup, c'est implicite.
        if (def.key === DEFAULT_AVATAR_KEY) continue;
        await this.notifications.create({
          userId,
          type: 'AVATAR_UNLOCKED',
          title: `Nouvel avatar : ${def.label}`,
          // Message de célébration — la condition (def.description) ne sert
          // qu'à expliquer comment débloquer les avatars encore verrouillés
          // dans la page "Mes avatars".
          body: `Tu as débloqué l'avatar ${def.label} ! Va le sélectionner depuis tes paramètres pour l'utiliser.`,
          data: { avatarKey: def.key, label: def.label },
        });
      }
    }

    return toUnlock;
  }

  /**
   * Liste des 8 avatars avec leur statut pour le user — y compris les
   * verrouillés (avec leur progression) pour permettre l'affichage UI.
   */
  async listForUser(userId: string): Promise<AvatarStatus[]> {
    const [stats, unlocks] = await Promise.all([
      this.computeStats(userId),
      this.prisma.avatarUnlock.findMany({ where: { userId } }),
    ]);
    const unlockByKey = new Map(unlocks.map((u) => [u.avatarKey, u]));

    return AVATAR_DEFINITIONS.map((def) => {
      const unlock = unlockByKey.get(def.key);
      const result = def.evaluate(stats);
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        isUnlocked: !!unlock,
        unlockedAt: unlock?.unlockedAt ?? null,
        progress: result.progress ?? null,
      };
    });
  }

  /**
   * Vérifie qu'un preset est débloqué pour cet user (utilisé par
   * `PATCH /users/me/avatar`). Renvoie `false` si la clé n'est pas reconnue
   * ou pas débloquée.
   */
  async isUnlocked(userId: string, avatarKey: string): Promise<boolean> {
    const found = await this.prisma.avatarUnlock.findUnique({
      where: { userId_avatarKey: { userId, avatarKey } },
      select: { id: true },
    });
    return !!found;
  }

  // --- Helpers --------------------------------------------------------------

  /**
   * Calcule l'agrégat `UserStats` en parallèle (1 query par stat).
   *
   * `totalContributedAmount` somme toutes les Transaction expense liées à une
   * catégorie système (kind SAVINGS ou POT). Source unique de vérité depuis
   * que les cotisations passent par le flux Transaction.
   */
  private async computeStats(userId: string): Promise<UserStats> {
    const goalCompletedBadge = await this.prisma.badge.findUnique({
      where: { code: 'GOAL_COMPLETED' },
      select: { id: true },
    });

    const [
      user,
      transactionsCount,
      savingsGoal,
      articlesCount,
      contributionsAgg,
      goalBadge,
    ] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { bestStreak: true },
      }),
      this.prisma.transaction.count({ where: { userId } }),
      this.prisma.savingsGoal.findUnique({
        where: { userId },
        select: { id: true },
      }),
      this.prisma.article.count({ where: { authorId: userId } }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          expenseCategory: { kind: { in: ['SAVINGS', 'POT'] } },
        },
        _sum: { amount: true },
      }),
      goalCompletedBadge
        ? this.prisma.userBadge.findUnique({
            where: {
              userId_badgeId: { userId, badgeId: goalCompletedBadge.id },
            },
            select: { userId: true },
          })
        : Promise.resolve(null),
    ]);

    const totalContributedAmount = contributionsAgg._sum.amount ?? 0;

    return {
      bestStreak: user.bestStreak,
      transactionsCount,
      hasSavingsGoal: !!savingsGoal,
      articlesCount,
      totalContributedAmount,
      hasGoalCompletedBadge: !!goalBadge,
    };
  }
}

// Re-export type imports for consumers
export type { Prisma };
