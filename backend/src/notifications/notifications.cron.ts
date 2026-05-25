import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/**
 * Crons des notifications.
 *
 * - **18h chaque jour** (timezone serveur) : pour chaque user qui a un objectif
 *   d'épargne actif et qui n'a PAS encore contribué aujourd'hui, on envoie un
 *   `CONTRIBUTION_REMINDER`. Idempotent : si la notif a déjà été envoyée plus
 *   tôt dans la journée (cas d'un redémarrage / multiple-instances), on skippe.
 *
 * Note : si un user a une streak active (>= 1) on adapte le message pour
 *   activer le sentiment de "à toi de pas casser ta lancée" (STREAK_AT_RISK).
 */
@Injectable()
export class NotificationsCron {
  private readonly logger = new Logger(NotificationsCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6PM, { name: 'contribution-reminder' })
  async dailyContributionReminder() {
    const now = new Date();
    const todayStart = startOfDay(now);

    // Users avec un goal actif et qui n'ont rien contribué aujourd'hui.
    const users = await this.prisma.user.findMany({
      where: {
        savingsGoal: { isCompleted: false },
        OR: [
          { lastContributionAt: null },
          { lastContributionAt: { lt: todayStart } },
        ],
      },
      select: { id: true, currentStreak: true },
    });

    let sent = 0;
    let skipped = 0;
    for (const u of users) {
      const isStreakAtRisk = u.currentStreak >= 1;
      const created = await this.notifications.createIfNotSentSince(
        {
          userId: u.id,
          type: isStreakAtRisk ? 'STREAK_AT_RISK' : 'CONTRIBUTION_REMINDER',
          title: isStreakAtRisk
            ? `Ne casse pas ta lancée de ${u.currentStreak} jours !`
            : "Pense à cotiser aujourd'hui",
          body: isStreakAtRisk
            ? "Tu n'as pas encore cotisé aujourd'hui — un petit geste suffit pour garder ton streak."
            : 'Une petite cotisation, même symbolique, fait avancer ton objectif.',
        },
        todayStart,
      );
      if (created) sent++;
      else skipped++;
    }

    this.logger.log(
      `Rappels quotidiens : ${sent} envoyés, ${skipped} déjà envoyés aujourd'hui (sur ${users.length} users actifs).`,
    );
  }
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
