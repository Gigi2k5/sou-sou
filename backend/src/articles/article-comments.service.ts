import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const commentSelect = {
  id: true,
  articleId: true,
  body: true,
  isHidden: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.ArticleCommentSelect;

@Injectable()
export class ArticleCommentsService {
  private readonly logger = new Logger(ArticleCommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly gamification: GamificationService,
  ) {}

  async list(
    user: { id: string; role: Role },
    articleId: string,
    query: ListCommentsDto,
  ) {
    // Vérifie que l'article existe + visibilité (admin voit tout, auteur voit ses
    // articles masqués).
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, authorId: true, isHidden: true },
    });
    if (!article) throw new NotFoundException('Article introuvable.');
    if (
      article.isHidden &&
      user.role !== Role.ADMIN &&
      article.authorId !== user.id
    ) {
      throw new NotFoundException('Article introuvable.');
    }

    // Les admins voient les commentaires masqués. Les users voient les non-masqués
    // + leurs propres commentaires masqués (cohérent avec articles).
    const where: Prisma.ArticleCommentWhereInput = {
      articleId,
      ...(user.role === Role.ADMIN
        ? {}
        : {
            OR: [{ isHidden: false }, { authorId: user.id }],
          }),
    };

    const [items, total] = await Promise.all([
      this.prisma.articleComment.findMany({
        where,
        select: commentSelect,
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.articleComment.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      pageCount: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async create(userId: string, articleId: string, dto: CreateCommentDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, authorId: true, title: true, isHidden: true },
    });
    if (!article) throw new NotFoundException('Article introuvable.');
    if (article.isHidden) {
      throw new NotFoundException('Article introuvable.');
    }

    const isSelfComment = article.authorId === userId;

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.articleComment.create({
        data: {
          articleId,
          authorId: userId,
          body: dto.body.trim(),
        },
        select: commentSelect,
      });

      await tx.article.update({
        where: { id: articleId },
        data: { commentCount: { increment: 1 } },
      });

      // Pas de gamification + notif si l'auteur commente son propre article.
      if (!isSelfComment) {
        await this.gamification.applyArticleEngagement(
          tx,
          article.authorId,
          'COMMENT',
        );

        const commenter = await tx.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        await this.notifications.create(
          {
            userId: article.authorId,
            type: 'ARTICLE_COMMENTED',
            title: 'Nouveau commentaire',
            body: `${commenter?.name ?? 'Quelqu’un'} a commenté « ${article.title} ».`,
            data: {
              articleId,
              commentId: comment.id,
              commenterId: userId,
            },
          },
          tx,
        );
      }

      return comment;
    });
  }

  async update(
    user: { id: string; role: Role },
    commentId: string,
    dto: UpdateCommentDto,
  ) {
    const existing = await this.prisma.articleComment.findUnique({
      where: { id: commentId },
      select: { authorId: true, isHidden: true },
    });
    if (!existing) throw new NotFoundException('Commentaire introuvable.');
    // Seul l'auteur peut modifier (pas l'admin — qui peut masquer mais pas réécrire).
    if (existing.authorId !== user.id) {
      throw new ForbiddenException(
        'Tu ne peux modifier que tes propres commentaires.',
      );
    }
    if (existing.isHidden) {
      throw new ForbiddenException(
        'Ce commentaire est masqué — édition impossible.',
      );
    }
    return this.prisma.articleComment.update({
      where: { id: commentId },
      data: { body: dto.body.trim() },
      select: commentSelect,
    });
  }

  async remove(user: { id: string; role: Role }, commentId: string) {
    const existing = await this.prisma.articleComment.findUnique({
      where: { id: commentId },
      select: { authorId: true, articleId: true },
    });
    if (!existing) throw new NotFoundException('Commentaire introuvable.');
    if (existing.authorId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Tu ne peux supprimer que tes propres commentaires.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.articleComment.delete({ where: { id: commentId } });
      await tx.article.update({
        where: { id: existing.articleId },
        data: { commentCount: { decrement: 1 } },
      });
    });
  }
}
