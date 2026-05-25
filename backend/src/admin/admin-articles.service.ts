import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotifType, Prisma } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLogService } from './admin-log.service';
import {
  AdminArticleTab,
  ListAdminArticlesDto,
} from './dto/list-admin-articles.dto';

const adminArticleListSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  isHidden: true,
  hiddenAt: true,
  hiddenBy: true,
  hiddenReason: true,
  reportCount: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, name: true, email: true, avatarUrl: true, isBanned: true },
  },
} satisfies Prisma.ArticleSelect;

const adminArticleDetailSelect = {
  ...adminArticleListSelect,
  content: true,
} satisfies Prisma.ArticleSelect;

@Injectable()
export class AdminArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLog: AdminLogService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query: ListAdminArticlesDto) {
    const where: Prisma.ArticleWhereInput = {};
    if (query.tab === AdminArticleTab.HIDDEN) {
      where.isHidden = true;
    } else if (query.tab === AdminArticleTab.REPORTED) {
      where.reportCount = { gt: 0 };
      where.isHidden = false;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { author: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.ArticleOrderByWithRelationInput[] =
      query.tab === AdminArticleTab.REPORTED
        ? [{ reportCount: 'desc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }];

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        select: adminArticleListSelect,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      pageCount: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getDetail(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: adminArticleDetailSelect,
    });
    if (!article) throw new NotFoundException('Article introuvable.');

    const reports = await this.prisma.report.findMany({
      where: { targetType: 'ARTICLE', targetId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
        reporter: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return { ...article, reports };
  }

  async hide(adminId: string, id: string, reason: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true, title: true, authorId: true, isHidden: true },
    });
    if (!article) throw new NotFoundException('Article introuvable.');
    if (article.isHidden) {
      throw new BadRequestException('Cet article est déjà masqué.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.article.update({
        where: { id },
        data: {
          isHidden: true,
          hiddenAt: new Date(),
          hiddenBy: adminId,
          hiddenReason: reason,
        },
        select: adminArticleDetailSelect,
      });

      await this.adminLog.record(
        {
          adminId,
          action: 'HIDE_ARTICLE',
          targetType: 'ARTICLE',
          targetId: id,
          details: { reason, title: article.title },
        },
        tx,
      );

      // Notifie l'auteur que son article a été masqué.
      await this.notifications.create(
        {
          userId: article.authorId,
          type: NotifType.ADMIN_HIDE_NOTICE,
          title: 'Ton article a été masqué',
          body: `« ${article.title} » a été masqué par la modération. Raison : ${reason}`,
          data: { articleId: id, reason },
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  async unhide(adminId: string, id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true, title: true, isHidden: true },
    });
    if (!article) throw new NotFoundException('Article introuvable.');
    if (!article.isHidden) {
      throw new BadRequestException("Cet article n'est pas masqué.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.article.update({
        where: { id },
        data: {
          isHidden: false,
          hiddenAt: null,
          hiddenBy: null,
          hiddenReason: null,
        },
        select: adminArticleDetailSelect,
      });

      await this.adminLog.record(
        {
          adminId,
          action: 'UNHIDE_ARTICLE',
          targetType: 'ARTICLE',
          targetId: id,
          details: { title: article.title },
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  async remove(adminId: string, id: string, reason: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true, title: true, authorId: true },
    });
    if (!article) throw new NotFoundException('Article introuvable.');

    await this.prisma.$transaction(async (tx) => {
      // Notifie d'abord l'auteur (avant de perdre l'authorId si on cascade un jour).
      await this.notifications.create(
        {
          userId: article.authorId,
          type: NotifType.ADMIN_DELETE_NOTICE,
          title: 'Ton article a été supprimé',
          body: `« ${article.title} » a été supprimé par la modération. Raison : ${reason}`,
          data: { title: article.title, reason },
        },
        tx,
      );

      await this.adminLog.record(
        {
          adminId,
          action: 'DELETE_ARTICLE',
          targetType: 'ARTICLE',
          targetId: id,
          details: { title: article.title, authorId: article.authorId, reason },
        },
        tx,
      );

      await tx.article.delete({ where: { id } });
    });
  }

  async warnAuthor(adminId: string, id: string, message: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true, title: true, authorId: true },
    });
    if (!article) throw new NotFoundException('Article introuvable.');

    await this.prisma.$transaction(async (tx) => {
      await this.notifications.create(
        {
          userId: article.authorId,
          type: NotifType.ADMIN_WARNING,
          title: 'Avertissement modération',
          body: message,
          data: { articleId: id, articleTitle: article.title },
        },
        tx,
      );

      await this.adminLog.record(
        {
          adminId,
          action: 'WARN_AUTHOR',
          targetType: 'ARTICLE',
          targetId: id,
          details: { authorId: article.authorId, message },
        },
        tx,
      );
    });

    return { ok: true };
  }
}
