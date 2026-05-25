import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  BroadcastSegment,
  NotifType,
  Prisma,
  Role,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AdminLogService } from './admin-log.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';

const DAY_MS = 86_400_000;

@Injectable()
export class AdminBroadcastsService {
  private readonly logger = new Logger(AdminBroadcastsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLog: AdminLogService,
  ) {}

  /**
   * Construit le `where` Prisma correspondant à un segment.
   * On exclut systématiquement les comptes bannis et les comptes anonymisés
   * (RGPD : email préfixé `deleted-*@anonymized.local`).
   */
  private segmentToWhere(segment: BroadcastSegment): Prisma.UserWhereInput {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now - 30 * DAY_MS);

    const baseExclusions: Prisma.UserWhereInput = {
      isBanned: false,
      NOT: { email: { startsWith: 'deleted-' } },
    };

    switch (segment) {
      case BroadcastSegment.ALL:
        return baseExclusions;
      case BroadcastSegment.ACTIVE_7D:
        return {
          ...baseExclusions,
          lastLoginAt: { gte: sevenDaysAgo },
        };
      case BroadcastSegment.INACTIVE_30D:
        return {
          ...baseExclusions,
          OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: thirtyDaysAgo } }],
        };
      case BroadcastSegment.NEW_USERS_7D:
        return {
          ...baseExclusions,
          createdAt: { gte: sevenDaysAgo },
        };
      case BroadcastSegment.ADMINS:
        return {
          ...baseExclusions,
          role: Role.ADMIN,
        };
    }
  }

  /** Compte les destinataires d'un segment sans rien envoyer (preview live). */
  async preview(segment: BroadcastSegment) {
    const recipientCount = await this.prisma.user.count({
      where: this.segmentToWhere(segment),
    });
    return { segment, recipientCount };
  }

  /** Liste paginée de l'historique des broadcasts. */
  async list(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.broadcast.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          body: true,
          segment: true,
          recipientCount: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      this.prisma.broadcast.count(),
    ]);
    return {
      items,
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Crée un broadcast et envoie les notifications en bulk dans une seule
   * transaction. Si la transaction échoue, aucun broadcast ni aucune notif
   * n'est créé.
   */
  async create(adminId: string, dto: CreateBroadcastDto) {
    const recipients = await this.prisma.user.findMany({
      where: this.segmentToWhere(dto.segment),
      select: { id: true },
    });

    if (recipients.length === 0) {
      throw new BadRequestException(
        'Aucun destinataire dans ce segment — broadcast annulé.',
      );
    }

    const broadcast = await this.prisma.$transaction(async (tx) => {
      const created = await tx.broadcast.create({
        data: {
          title: dto.title,
          body: dto.body,
          segment: dto.segment,
          recipientCount: recipients.length,
          createdById: adminId,
        },
        select: {
          id: true,
          title: true,
          body: true,
          segment: true,
          recipientCount: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      await tx.notification.createMany({
        data: recipients.map((u) => ({
          userId: u.id,
          type: NotifType.ADMIN_BROADCAST,
          title: dto.title,
          body: dto.body,
          data: { broadcastId: created.id, segment: dto.segment } as Prisma.InputJsonValue,
        })),
      });

      await this.adminLog.record(
        {
          adminId,
          action: 'BROADCAST',
          targetType: 'BROADCAST',
          targetId: created.id,
          details: {
            segment: dto.segment,
            recipientCount: recipients.length,
            title: dto.title,
          },
        },
        tx,
      );

      return created;
    });

    this.logger.log(
      `Broadcast ${broadcast.id} envoyé à ${recipients.length} users (segment ${dto.segment})`,
    );

    return broadcast;
  }
}
