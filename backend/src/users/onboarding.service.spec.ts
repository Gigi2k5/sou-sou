import { NotFoundException } from '@nestjs/common';

import { OnboardingService } from './onboarding.service';

/**
 * Tests unitaires : update step, idempotence de la complétion (pas de double
 * bonus), branchement gamification + état final.
 */

interface FakeUser {
  id: string;
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  onboardingCompletedAt: Date | null;
}

function makePrismaMock(users: FakeUser[]) {
  const findUser = (id: string) => users.find((u) => u.id === id) ?? null;

  const userOps = {
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      const u = findUser(where.id);
      if (!u) return null;
      return { ...u };
    }),
    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const u = findUser(where.id);
        if (!u) return null;
        if (data.hasCompletedOnboarding !== undefined)
          u.hasCompletedOnboarding = data.hasCompletedOnboarding as boolean;
        if (data.onboardingStep !== undefined)
          u.onboardingStep = data.onboardingStep as number;
        if (data.onboardingCompletedAt !== undefined)
          u.onboardingCompletedAt = data.onboardingCompletedAt as Date;
        return { ...u };
      },
    ),
  };

  const tx = { user: userOps };
  type Tx = typeof tx;

  return {
    user: userOps,
    $transaction: jest.fn(async (fn: (tx: Tx) => Promise<unknown>) => fn(tx)),
  };
}

describe('OnboardingService', () => {
  const gamificationMock = {
    applyOnboardingCompleted: jest.fn(async () => ({
      pointsEarned: 50,
      totalPoints: 50,
      newBadges: [
        {
          id: 'b-welcome',
          code: 'WELCOME',
          name: 'Bienvenue',
          description: '',
          icon: 'PartyPopper',
        },
      ],
    })),
  } as unknown as ConstructorParameters<typeof OnboardingService>[1];

  const notificationsMock = {
    create: jest.fn(),
  } as unknown as ConstructorParameters<typeof OnboardingService>[2];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getState renvoie l’état courant', async () => {
    const users: FakeUser[] = [
      {
        id: 'u1',
        hasCompletedOnboarding: false,
        onboardingStep: 2,
        onboardingCompletedAt: null,
      },
    ];
    const prisma = makePrismaMock(users);
    const svc = new OnboardingService(
      prisma as never,
      gamificationMock,
      notificationsMock,
    );

    const r = await svc.getState('u1');
    expect(r).toMatchObject({
      hasCompletedOnboarding: false,
      onboardingStep: 2,
      onboardingCompletedAt: null,
    });
  });

  it('getState : NotFoundException si user inexistant', async () => {
    const prisma = makePrismaMock([]);
    const svc = new OnboardingService(
      prisma as never,
      gamificationMock,
      notificationsMock,
    );
    await expect(svc.getState('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update step seul → no gamification, juste l’update', async () => {
    const users: FakeUser[] = [
      {
        id: 'u1',
        hasCompletedOnboarding: false,
        onboardingStep: 0,
        onboardingCompletedAt: null,
      },
    ];
    const prisma = makePrismaMock(users);
    const svc = new OnboardingService(
      prisma as never,
      gamificationMock,
      notificationsMock,
    );

    const r = await svc.update('u1', { step: 3 });

    expect(r.onboardingStep).toBe(3);
    expect(r.hasCompletedOnboarding).toBe(false);
    expect(r.pointsEarned).toBe(0);
    expect(r.newBadges).toEqual([]);
    expect(gamificationMock.applyOnboardingCompleted).not.toHaveBeenCalled();
  });

  it('completed=true sur user non complété → +50 pts + badge WELCOME', async () => {
    const users: FakeUser[] = [
      {
        id: 'u1',
        hasCompletedOnboarding: false,
        onboardingStep: 4,
        onboardingCompletedAt: null,
      },
    ];
    const prisma = makePrismaMock(users);
    const svc = new OnboardingService(
      prisma as never,
      gamificationMock,
      notificationsMock,
    );

    const r = await svc.update('u1', { completed: true, step: 5 });

    expect(r.hasCompletedOnboarding).toBe(true);
    expect(r.onboardingStep).toBe(5);
    expect(r.onboardingCompletedAt).toBeInstanceOf(Date);
    expect(r.pointsEarned).toBe(50);
    expect(r.newBadges.map((b) => b.code)).toContain('WELCOME');
    expect(gamificationMock.applyOnboardingCompleted).toHaveBeenCalledTimes(1);
    expect(users[0].hasCompletedOnboarding).toBe(true);
  });

  it('completed=true idempotent : déjà complété → pas de double bonus', async () => {
    const past = new Date('2026-04-01T00:00:00Z');
    const users: FakeUser[] = [
      {
        id: 'u1',
        hasCompletedOnboarding: true,
        onboardingStep: 5,
        onboardingCompletedAt: past,
      },
    ];
    const prisma = makePrismaMock(users);
    const svc = new OnboardingService(
      prisma as never,
      gamificationMock,
      notificationsMock,
    );

    const r = await svc.update('u1', { completed: true });

    expect(r.hasCompletedOnboarding).toBe(true);
    expect(r.onboardingCompletedAt).toEqual(past); // inchangé
    expect(r.pointsEarned).toBe(0);
    expect(r.newBadges).toEqual([]);
    expect(gamificationMock.applyOnboardingCompleted).not.toHaveBeenCalled();
  });

  it('update : NotFoundException si user inexistant', async () => {
    const prisma = makePrismaMock([]);
    const svc = new OnboardingService(
      prisma as never,
      gamificationMock,
      notificationsMock,
    );
    await expect(svc.update('nope', { step: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
