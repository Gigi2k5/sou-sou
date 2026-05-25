import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Badge } from '@prisma/client';

import {
  GamificationService,
  POINTS_ONBOARDING_COMPLETED,
} from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  onboardingCompletedAt: Date | null;
}

export interface OnboardingUpdateResult extends OnboardingState {
  /** Points crédités cette fois-ci (0 si pas de complétion). */
  pointsEarned: number;
  /** Badges débloqués cette fois-ci (vide si pas de complétion ou WELCOME déjà unlock). */
  newBadges: Badge[];
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
    private readonly notifications: NotificationsService,
  ) {}

  async getState(userId: string): Promise<OnboardingState> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        hasCompletedOnboarding: true,
        onboardingStep: true,
        onboardingCompletedAt: true,
      },
    });
    if (!u) throw new NotFoundException();
    return u;
  }

  /**
   * Met à jour la step et/ou marque comme complété.
   * - Si `completed: true` ET `hasCompletedOnboarding === false` → transaction
   *   atomique : flag flip + +50 pts + badge WELCOME + notif BADGE_UNLOCKED.
   * - Si l'user était déjà complété, on ignore le `completed: true` (idempotent,
   *   pas de double bonus). On peut quand même mettre à jour `step` (no-op courant).
   */
  async update(
    userId: string,
    dto: UpdateOnboardingDto,
  ): Promise<OnboardingUpdateResult> {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        hasCompletedOnboarding: true,
        onboardingStep: true,
        onboardingCompletedAt: true,
      },
    });
    if (!current) throw new NotFoundException();

    const wantsCompletion = dto.completed === true;
    const alreadyCompleted = current.hasCompletedOnboarding;
    const shouldComplete = wantsCompletion && !alreadyCompleted;

    if (!shouldComplete) {
      // Simple update : juste la step si fournie, sinon no-op. Pas de gamification.
      const next = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.step !== undefined ? { onboardingStep: dto.step } : {}),
          // Si user demande completed mais déjà complété : on garde tel quel (idempotent).
        },
        select: {
          hasCompletedOnboarding: true,
          onboardingStep: true,
          onboardingCompletedAt: true,
        },
      });
      return { ...next, pointsEarned: 0, newBadges: [] };
    }

    // Complétion réelle : transaction atomique pour rester cohérent en cas de crash.
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date(),
          ...(dto.step !== undefined ? { onboardingStep: dto.step } : {}),
        },
        select: {
          hasCompletedOnboarding: true,
          onboardingStep: true,
          onboardingCompletedAt: true,
        },
      });

      const gam = await this.gamification.applyOnboardingCompleted(tx, userId);
      return { state: updated, gam };
    });

    return {
      ...result.state,
      pointsEarned: result.gam.pointsEarned,
      newBadges: result.gam.newBadges,
    };
  }
}

// Re-export pour les imports côté tests / contrôleurs.
export { POINTS_ONBOARDING_COMPLETED };
