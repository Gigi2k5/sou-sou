import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Badge, Prisma } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { BADGES } from './badges';

const POINTS_PER_CONTRIBUTION = 10;
const POINTS_BONUS_STREAK_3 = 5;
const POINTS_BONUS_STREAK_7 = 10;
const POINTS_BONUS_STREAK_30 = 20;
const POINTS_GOAL_COMPLETED = 100;

// V4 — engagement social
export const POINTS_PER_LIKE_RECEIVED = 1;
export const POINTS_PER_COMMENT_RECEIVED = 3;
export const POPULAR_ARTICLE_THRESHOLD = 10;

// V4 — onboarding
export const POINTS_ONBOARDING_COMPLETED = 50;

export interface ContributionGamification {
  pointsEarned: number;
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  newBadges: Badge[];
}

export interface GoalCompletedGamification {
  bonusPoints: number;
  totalPoints: number;
  /**
   * Badges débloqués en plus par la complétion. Inclut au moins GOAL_COMPLETED
   * (sauf s'il était déjà unlocké) et peut inclure des paliers de points
   * franchis grâce au bonus de +100.
   */
  newBadges: Badge[];
}

export interface UserStats {
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  lastContributionAt: Date | null;
  unlockedBadges: number;
  totalBadges: number;
}

@Injectable()
export class GamificationService implements OnModuleInit {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.prisma.$transaction(
      BADGES.map((b) =>
        this.prisma.badge.upsert({
          where: { code: b.code },
          create: b,
          update: {
            name: b.name,
            description: b.description,
            icon: b.icon,
          },
        }),
      ),
    );
    this.logger.log(`Badges synchronisés (${BADGES.length}).`);
  }

  /**
   * Applique les conséquences d'une nouvelle contribution :
   * - met à jour streak / bestStreak / lastContributionAt / totalPoints sur User
   * - débloque les badges atteints
   *
   * Doit être appelée à l'intérieur d'une transaction Prisma pour rester atomique.
   */
  async applyContribution(
    tx: Prisma.TransactionClient,
    userId: string,
    contributionDate: Date,
  ): Promise<ContributionGamification> {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    const todayStart = startOfDay(contributionDate);
    const lastDayStart = user.lastContributionAt
      ? startOfDay(user.lastContributionAt)
      : null;

    let newStreak: number;
    if (lastDayStart && lastDayStart.getTime() === todayStart.getTime()) {
      // Déjà une contribution aujourd'hui : streak inchangé.
      newStreak = user.currentStreak;
    } else if (lastDayStart && diffDays(todayStart, lastDayStart) === 1) {
      newStreak = user.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const newBestStreak = Math.max(user.bestStreak, newStreak);

    // Points : base + bonus streak (par paliers atteints)
    let pointsEarned = POINTS_PER_CONTRIBUTION;
    if (newStreak >= 3) pointsEarned += POINTS_BONUS_STREAK_3;
    if (newStreak >= 7) pointsEarned += POINTS_BONUS_STREAK_7;
    if (newStreak >= 30) pointsEarned += POINTS_BONUS_STREAK_30;

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        bestStreak: newBestStreak,
        lastContributionAt: contributionDate,
        totalPoints: { increment: pointsEarned },
      },
    });

    const newBadges = await this.unlockBadges(tx, userId, {
      hasContribution: true,
      currentStreak: newStreak,
      totalPoints: updated.totalPoints,
    });

    return {
      pointsEarned,
      totalPoints: updated.totalPoints,
      currentStreak: newStreak,
      bestStreak: newBestStreak,
      newBadges,
    };
  }

  /**
   * Engagement social V4 : un user a reçu un like ou un comment sur un de ses
   * articles. On crédite l'auteur (pas le liker/commenter), on check les
   * paliers de points franchis, et éventuellement le badge POPULAR_ARTICLE
   * si l'article qui a déclenché atteint le seuil.
   *
   * `articleLikeCount` est passé après l'incrément pour qu'on puisse comparer
   * au seuil — `undefined` si l'évent est un comment (pas de check populaire).
   */
  async applyArticleEngagement(
    tx: Prisma.TransactionClient,
    authorId: string,
    kind: 'LIKE' | 'COMMENT',
    articleLikeCount?: number,
  ): Promise<{
    pointsEarned: number;
    totalPoints: number;
    newBadges: Badge[];
  }> {
    const points =
      kind === 'LIKE' ? POINTS_PER_LIKE_RECEIVED : POINTS_PER_COMMENT_RECEIVED;

    const updated = await tx.user.update({
      where: { id: authorId },
      data: { totalPoints: { increment: points } },
    });

    const popularReached =
      kind === 'LIKE' &&
      articleLikeCount !== undefined &&
      articleLikeCount >= POPULAR_ARTICLE_THRESHOLD;

    const newBadges = await this.unlockBadges(tx, authorId, {
      totalPoints: updated.totalPoints,
      popularArticle: popularReached,
    });

    return {
      pointsEarned: points,
      totalPoints: updated.totalPoints,
      newBadges,
    };
  }

  /**
   * Onboarding V4 : appelé une seule fois quand l'user marque son onboarding
   * comme complété. Crédite +50 pts et débloque le badge WELCOME.
   *
   * Idempotent vis-à-vis du badge (UserBadge a une @@id composite donc
   * unlockBadges ignore les déjà débloqués), mais les +50 pts ne le sont pas
   * — la garde "ne pas re-déclencher" est côté caller (OnboardingService).
   */
  async applyOnboardingCompleted(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<{
    pointsEarned: number;
    totalPoints: number;
    newBadges: Badge[];
  }> {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { totalPoints: { increment: POINTS_ONBOARDING_COMPLETED } },
    });

    const newBadges = await this.unlockBadges(tx, userId, {
      welcome: true,
      totalPoints: updated.totalPoints,
    });

    return {
      pointsEarned: POINTS_ONBOARDING_COMPLETED,
      totalPoints: updated.totalPoints,
      newBadges,
    };
  }

  async applyGoalCompleted(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<GoalCompletedGamification> {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { totalPoints: { increment: POINTS_GOAL_COMPLETED } },
    });

    const newBadges = await this.unlockBadges(tx, userId, {
      goalCompleted: true,
      totalPoints: updated.totalPoints,
    });

    await this.notifications.create(
      {
        userId,
        type: 'GOAL_COMPLETED',
        title: 'Objectif atteint !',
        body: `Tu as atteint ton objectif d'épargne. +${POINTS_GOAL_COMPLETED} points bonus.`,
        data: { bonusPoints: POINTS_GOAL_COMPLETED },
      },
      tx,
    );

    return {
      bonusPoints: POINTS_GOAL_COMPLETED,
      totalPoints: updated.totalPoints,
      newBadges,
    };
  }

  async getStats(userId: string): Promise<UserStats> {
    const [user, unlockedCount, totalBadges] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          totalPoints: true,
          currentStreak: true,
          bestStreak: true,
          lastContributionAt: true,
        },
      }),
      this.prisma.userBadge.count({ where: { userId } }),
      this.prisma.badge.count(),
    ]);
    return {
      totalPoints: user.totalPoints,
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
      lastContributionAt: user.lastContributionAt,
      unlockedBadges: unlockedCount,
      totalBadges,
    };
  }

  /**
   * Liste tous les badges avec un flag `unlocked` et la date d'obtention.
   */
  async listBadges(userId: string) {
    const [badges, unlocked] = await Promise.all([
      this.prisma.badge.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true, unlockedAt: true },
      }),
    ]);
    const unlockedMap = new Map(unlocked.map((u) => [u.badgeId, u.unlockedAt]));
    return badges.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      description: b.description,
      icon: b.icon,
      unlocked: unlockedMap.has(b.id),
      unlockedAt: unlockedMap.get(b.id) ?? null,
    }));
  }

  // -- Helpers ----------------------------------------------------------------

  private async unlockBadges(
    tx: Prisma.TransactionClient,
    userId: string,
    triggers: {
      hasContribution?: boolean;
      goalCompleted?: boolean;
      currentStreak?: number;
      totalPoints?: number;
      popularArticle?: boolean;
      welcome?: boolean;
    },
  ): Promise<Badge[]> {
    const candidates: string[] = [];
    if (triggers.hasContribution) candidates.push('FIRST_CONTRIB');
    if (triggers.goalCompleted) candidates.push('GOAL_COMPLETED');
    if (triggers.currentStreak !== undefined) {
      if (triggers.currentStreak >= 3) candidates.push('STREAK_3');
      if (triggers.currentStreak >= 7) candidates.push('STREAK_7');
      if (triggers.currentStreak >= 30) candidates.push('STREAK_30');
    }
    if (triggers.totalPoints !== undefined) {
      if (triggers.totalPoints >= 100) candidates.push('POINTS_100');
      if (triggers.totalPoints >= 500) candidates.push('POINTS_500');
    }
    if (triggers.popularArticle) candidates.push('POPULAR_ARTICLE');
    if (triggers.welcome) candidates.push('WELCOME');
    if (candidates.length === 0) return [];

    const badges = await tx.badge.findMany({
      where: { code: { in: candidates } },
    });
    if (badges.length === 0) return [];

    const existing = await tx.userBadge.findMany({
      where: { userId, badgeId: { in: badges.map((b) => b.id) } },
      select: { badgeId: true },
    });
    const existingIds = new Set(existing.map((e) => e.badgeId));

    const toUnlock = badges.filter((b) => !existingIds.has(b.id));
    if (toUnlock.length === 0) return [];

    await tx.userBadge.createMany({
      data: toUnlock.map((b) => ({ userId, badgeId: b.id })),
    });

    // Une notif par badge nouvellement débloqué.
    for (const badge of toUnlock) {
      await this.notifications.create(
        {
          userId,
          type: 'BADGE_UNLOCKED',
          title: `Badge débloqué : ${badge.name}`,
          body: badge.description,
          data: { badgeCode: badge.code, icon: badge.icon },
        },
        tx,
      );
    }

    return toUnlock;
  }
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function diffDays(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / 86_400_000);
}
