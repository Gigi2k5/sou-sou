import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotifType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

export interface CreateNotificationInput {
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une notification. Peut être appelée depuis n'importe quel module
   * (contributions, gamification, cron, etc.). On accepte optionnellement
   * un client de transaction pour rester atomique avec l'opération métier.
   */
  async create(input: CreateNotificationInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      },
    });
  }

  async list(userId: string, query: ListNotificationsDto) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return {
      items,
      total,
      unreadCount,
      page: query.page,
      limit: query.limit,
      pageCount: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: string, id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) {
      throw new NotFoundException('Notification introuvable.');
    }
    if (notif.isRead) return notif;
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  async remove(userId: string, id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) {
      throw new NotFoundException('Notification introuvable.');
    }
    await this.prisma.notification.delete({ where: { id } });
  }

  /**
   * Idempotence pour le rappel quotidien : ne crée la notif que si aucune
   * notif du même type n'a déjà été envoyée à cet user depuis `sinceDate`.
   * Renvoie true si une notif a été créée, false sinon.
   */
  async createIfNotSentSince(
    input: CreateNotificationInput,
    sinceDate: Date,
  ): Promise<boolean> {
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        createdAt: { gte: sinceDate },
      },
      select: { id: true },
    });
    if (existing) return false;
    await this.create(input);
    return true;
  }
}
