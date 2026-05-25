import { Test } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from './gamification.service';

const notificationsMock = { create: jest.fn() };

/**
 * Test la logique de streak / paliers de points / déblocage de badges.
 * On mocke prisma au minimum nécessaire — on ne couvre pas les transactions.
 */

interface FakeUser {
  id: string;
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  lastContributionAt: Date | null;
}

interface FakeBadge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
}

function makeFakeTx(
  user: FakeUser,
  badges: FakeBadge[],
  unlockedBadgeIds: Set<string>,
) {
  return {
    user: {
      findUniqueOrThrow: jest.fn(async () => ({ ...user })),
      update: jest.fn(async (args: { data: Record<string, unknown> }) => {
        const data = args.data;
        if (data.currentStreak !== undefined)
          user.currentStreak = data.currentStreak as number;
        if (data.bestStreak !== undefined)
          user.bestStreak = data.bestStreak as number;
        if (data.lastContributionAt !== undefined)
          user.lastContributionAt = data.lastContributionAt as Date;
        const tp = data.totalPoints;
        if (tp && typeof tp === 'object' && 'increment' in tp) {
          user.totalPoints += (tp as { increment: number }).increment;
        }
        return { ...user };
      }),
    },
    badge: {
      findMany: jest.fn(
        async ({ where }: { where: { code: { in: string[] } } }) =>
          badges.filter((b) => where.code.in.includes(b.code)),
      ),
    },
    userBadge: {
      findMany: jest.fn(
        async ({
          where,
        }: {
          where: { userId: string; badgeId: { in: string[] } };
        }) =>
          Array.from(unlockedBadgeIds)
            .filter((id) => where.badgeId.in.includes(id))
            .map((badgeId) => ({ badgeId })),
      ),
      createMany: jest.fn(
        async ({ data }: { data: { userId: string; badgeId: string }[] }) => {
          for (const d of data) unlockedBadgeIds.add(d.badgeId);
          return { count: data.length };
        },
      ),
    },
  } as unknown as Prisma.TransactionClient;
}

const ALL_BADGES: FakeBadge[] = [
  {
    id: 'b-first',
    code: 'FIRST_CONTRIB',
    name: 'Première graine',
    description: '',
    icon: 'Sprout',
  },
  {
    id: 'b-s3',
    code: 'STREAK_3',
    name: 'En route',
    description: '',
    icon: 'Flame',
  },
  {
    id: 'b-s7',
    code: 'STREAK_7',
    name: 'Sur la lancée',
    description: '',
    icon: 'Zap',
  },
  {
    id: 'b-s30',
    code: 'STREAK_30',
    name: 'Inarrêtable',
    description: '',
    icon: 'Trophy',
  },
  {
    id: 'b-p100',
    code: 'POINTS_100',
    name: 'Centurion',
    description: '',
    icon: 'Target',
  },
  {
    id: 'b-p500',
    code: 'POINTS_500',
    name: 'Investi',
    description: '',
    icon: 'Gem',
  },
  {
    id: 'b-goal',
    code: 'GOAL_COMPLETED',
    name: 'Objectif atteint',
    description: '',
    icon: 'PartyPopper',
  },
  {
    id: 'b-popular',
    code: 'POPULAR_ARTICLE',
    name: 'Populaire',
    description: '',
    icon: 'Heart',
  },
  {
    id: 'b-welcome',
    code: 'WELCOME',
    name: 'Bienvenue',
    description: '',
    icon: 'PartyPopper',
  },
];

describe('GamificationService.applyContribution', () => {
  let service: GamificationService;
  let user: FakeUser;
  let unlocked: Set<string>;

  beforeEach(async () => {
    user = {
      id: 'u1',
      totalPoints: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastContributionAt: null,
    };
    unlocked = new Set();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GamificationService,
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn(), badge: { upsert: jest.fn() } },
        },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();
    service = moduleRef.get(GamificationService);
  });

  it('first contribution → streak=1, +10 pts, badge FIRST_CONTRIB', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    const day1 = new Date('2026-04-01T12:00:00Z');

    const result = await service.applyContribution(tx, 'u1', day1);

    expect(result.currentStreak).toBe(1);
    expect(result.bestStreak).toBe(1);
    expect(result.pointsEarned).toBe(10);
    expect(result.totalPoints).toBe(10);
    expect(result.newBadges.map((b) => b.code)).toEqual(['FIRST_CONTRIB']);
  });

  it('two contributions same day → streak unchanged, +10 only on 2nd', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    const morning = new Date('2026-04-01T08:00:00Z');
    const evening = new Date('2026-04-01T20:00:00Z');

    await service.applyContribution(tx, 'u1', morning);
    const result = await service.applyContribution(tx, 'u1', evening);

    expect(result.currentStreak).toBe(1); // unchanged — same day
    expect(result.pointsEarned).toBe(10);
    expect(result.totalPoints).toBe(20);
    expect(result.newBadges).toEqual([]); // no new badges (FIRST already unlocked)
  });

  it('consecutive days reach streak 3 → STREAK_3 badge + bonus 5pts', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    const days = [
      new Date('2026-04-01T12:00:00Z'),
      new Date('2026-04-02T12:00:00Z'),
      new Date('2026-04-03T12:00:00Z'),
    ];
    let last;
    for (const d of days) {
      last = await service.applyContribution(tx, 'u1', d);
    }
    expect(last!.currentStreak).toBe(3);
    expect(last!.pointsEarned).toBe(15); // 10 base + 5 streak bonus
    expect(last!.newBadges.map((b) => b.code)).toContain('STREAK_3');
  });

  it('gap of 2 days → streak resets to 1', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    await service.applyContribution(tx, 'u1', new Date('2026-04-01T12:00:00Z'));
    await service.applyContribution(tx, 'u1', new Date('2026-04-02T12:00:00Z'));
    // skip April 3-4
    const result = await service.applyContribution(
      tx,
      'u1',
      new Date('2026-04-05T12:00:00Z'),
    );

    expect(result.currentStreak).toBe(1);
    expect(result.bestStreak).toBe(2); // remembers the previous best
    expect(result.pointsEarned).toBe(10);
  });

  it('streak 7 → bonus +5 (s3) +10 (s7) = +25 pts total', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    let last;
    for (let i = 0; i < 7; i++) {
      const d = new Date('2026-04-01T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + i);
      last = await service.applyContribution(tx, 'u1', d);
    }
    expect(last!.currentStreak).toBe(7);
    expect(last!.pointsEarned).toBe(25);
    expect(last!.newBadges.map((b) => b.code).sort()).toEqual([
      'POINTS_100',
      'STREAK_7',
    ]);
  });
});

describe('GamificationService.applyGoalCompleted', () => {
  it('+100 pts + GOAL_COMPLETED badge', async () => {
    const user: FakeUser = {
      id: 'u1',
      totalPoints: 50,
      currentStreak: 1,
      bestStreak: 1,
      lastContributionAt: null,
    };
    const unlocked = new Set<string>();
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);

    const moduleRef = await Test.createTestingModule({
      providers: [
        GamificationService,
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn(), badge: { upsert: jest.fn() } },
        },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();
    const service = moduleRef.get(GamificationService);

    const result = await service.applyGoalCompleted(tx, 'u1');

    expect(result.bonusPoints).toBe(100);
    expect(result.totalPoints).toBe(150);
    // Goal completion + crossing the 100 pts threshold (50 → 150) → 2 badges
    expect(result.newBadges.map((b) => b.code).sort()).toEqual([
      'GOAL_COMPLETED',
      'POINTS_100',
    ]);
  });
});

describe('GamificationService.applyArticleEngagement', () => {
  let service: GamificationService;
  let user: FakeUser;
  let unlocked: Set<string>;

  beforeEach(async () => {
    user = {
      id: 'u-author',
      totalPoints: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastContributionAt: null,
    };
    unlocked = new Set();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GamificationService,
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn(), badge: { upsert: jest.fn() } },
        },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();
    service = moduleRef.get(GamificationService);
  });

  it('LIKE crédite +1 pt à l’auteur', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    const r = await service.applyArticleEngagement(tx, 'u-author', 'LIKE', 1);
    expect(r.pointsEarned).toBe(1);
    expect(r.totalPoints).toBe(1);
    expect(r.newBadges).toEqual([]);
  });

  it('COMMENT crédite +3 pts à l’auteur', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    const r = await service.applyArticleEngagement(tx, 'u-author', 'COMMENT');
    expect(r.pointsEarned).toBe(3);
    expect(r.totalPoints).toBe(3);
  });

  it('like qui pousse l’article à 10 → débloque POPULAR_ARTICLE', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    const r = await service.applyArticleEngagement(tx, 'u-author', 'LIKE', 10);
    expect(r.newBadges.map((b) => b.code)).toContain('POPULAR_ARTICLE');
  });

  it('article sous le seuil → pas de POPULAR_ARTICLE', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    const r = await service.applyArticleEngagement(tx, 'u-author', 'LIKE', 9);
    expect(r.newBadges.map((b) => b.code)).not.toContain('POPULAR_ARTICLE');
  });

  it('comment ne déclenche jamais POPULAR_ARTICLE', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    // Même si articleLikeCount serait élevé, COMMENT ne le passe pas → pas de check.
    const r = await service.applyArticleEngagement(tx, 'u-author', 'COMMENT');
    expect(r.newBadges.map((b) => b.code)).not.toContain('POPULAR_ARTICLE');
  });

  it('badge POPULAR_ARTICLE n’est plus redonné une 2e fois', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    await service.applyArticleEngagement(tx, 'u-author', 'LIKE', 10);
    const r = await service.applyArticleEngagement(tx, 'u-author', 'LIKE', 11);
    expect(r.newBadges.map((b) => b.code)).not.toContain('POPULAR_ARTICLE');
  });
});

describe('GamificationService.applyOnboardingCompleted', () => {
  let service: GamificationService;
  let user: FakeUser;
  let unlocked: Set<string>;

  beforeEach(async () => {
    user = {
      id: 'u1',
      totalPoints: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastContributionAt: null,
    };
    unlocked = new Set();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GamificationService,
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn(), badge: { upsert: jest.fn() } },
        },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();
    service = moduleRef.get(GamificationService);
  });

  it('+50 pts et débloque WELCOME', async () => {
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    const r = await service.applyOnboardingCompleted(tx, 'u1');
    expect(r.pointsEarned).toBe(50);
    expect(r.totalPoints).toBe(50);
    expect(r.newBadges.map((b) => b.code)).toContain('WELCOME');
  });

  it('en passant à 100+ pts via le bonus, débloque aussi POINTS_100', async () => {
    user.totalPoints = 60; // 60 + 50 = 110
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);
    const r = await service.applyOnboardingCompleted(tx, 'u1');
    expect(r.totalPoints).toBe(110);
    expect(r.newBadges.map((b) => b.code).sort()).toEqual([
      'POINTS_100',
      'WELCOME',
    ]);
  });
});

describe('GamificationService.applyGoalCompleted (already unlocked)', () => {
  it('returns empty newBadges if all already unlocked', async () => {
    const user: FakeUser = {
      id: 'u1',
      totalPoints: 50,
      currentStreak: 1,
      bestStreak: 1,
      lastContributionAt: null,
    };
    // Both GOAL_COMPLETED and POINTS_100 already unlocked
    const unlocked = new Set<string>(['b-goal', 'b-p100']);
    const tx = makeFakeTx(user, ALL_BADGES, unlocked);

    const moduleRef = await Test.createTestingModule({
      providers: [
        GamificationService,
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn(), badge: { upsert: jest.fn() } },
        },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();
    const service = moduleRef.get(GamificationService);

    const result = await service.applyGoalCompleted(tx, 'u1');
    expect(result.newBadges).toEqual([]);
  });
});
