import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export interface LikeResult {
  liked: boolean;
  likeCount: number;
}

@Injectable()
export class ArticleLikesService {
  private readonly logger = new Logger(ArticleLikesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly gamification: GamificationService,
  ) {}

  /**
   * POST /articles/:id/like
   * Idempotent : si l'user like déjà, on renvoie l'état courant sans rien faire.
   * Refuse les self-likes (anti-farming).
   */
  async like(userId: string, articleId: string): Promise<LikeResult> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, authorId: true, title: true, isHidden: true },
    });
    if (!article) throw new NotFoundException('Article introuvable.');
    if (article.isHidden) {
      throw new NotFoundException('Article introuvable.');
    }
    if (article.authorId === userId) {
      throw new BadRequestException('Tu ne peux pas liker ton propre article.');
    }

    // Idempotence : si l'user like déjà, juste renvoyer l'état.
    const existing = await this.prisma.articleLike.findUnique({
      where: { articleId_userId: { articleId, userId } },
      select: { id: true },
    });
    if (existing) {
      return { liked: true, likeCount: await this.getLikeCount(articleId) };
    }

    // Like + incrément du compteur dénormalisé, dans une seule transaction.
    const updatedArticle = await this.prisma.$transaction(async (tx) => {
      await tx.articleLike.create({
        data: { articleId, userId },
      });
      const updated = await tx.article.update({
        where: { id: articleId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });

      // Gamification + notif pour l'auteur (déjà filtré : pas un self-like).
      await this.gamification.applyArticleEngagement(
        tx,
        article.authorId,
        'LIKE',
        updated.likeCount,
      );

      // Notif likée — un like = une notif (pas d'agrégation, cf. décision Q5).
      const liker = await tx.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      await this.notifications.create(
        {
          userId: article.authorId,
          type: 'ARTICLE_LIKED',
          title: 'Nouveau like !',
          body: `${liker?.name ?? 'Quelqu’un'} a liké « ${article.title} ».`,
          data: {
            articleId,
            likerId: userId,
          },
        },
        tx,
      );

      return updated;
    });

    return { liked: true, likeCount: updatedArticle.likeCount };
  }

  /**
   * DELETE /articles/:id/like
   * Idempotent : si pas de like existant, no-op.
   * Pas de notif "unlike" (par design).
   */
  async unlike(userId: string, articleId: string): Promise<LikeResult> {
    const existing = await this.prisma.articleLike.findUnique({
      where: { articleId_userId: { articleId, userId } },
      select: { id: true },
    });
    if (!existing) {
      // Pas de like → on récupère juste le count actuel et on renvoie.
      const a = await this.prisma.article.findUnique({
        where: { id: articleId },
        select: { likeCount: true },
      });
      if (!a) throw new NotFoundException('Article introuvable.');
      return { liked: false, likeCount: a.likeCount };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.articleLike.delete({ where: { id: existing.id } });
      const a = await tx.article.update({
        where: { id: articleId },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      });
      // Pas de gamification reverse — les points restent acquis (sinon abusable).
      return a;
    });

    return { liked: false, likeCount: updated.likeCount };
  }

  /**
   * Pour le front : savoir si l'user courant a liké l'article (et le count).
   * Utile sur la page détail.
   */
  async getStatus(userId: string, articleId: string): Promise<LikeResult> {
    const [like, article] = await Promise.all([
      this.prisma.articleLike.findUnique({
        where: { articleId_userId: { articleId, userId } },
        select: { id: true },
      }),
      this.prisma.article.findUnique({
        where: { id: articleId },
        select: { likeCount: true },
      }),
    ]);
    if (!article) throw new NotFoundException('Article introuvable.');
    return { liked: !!like, likeCount: article.likeCount };
  }

  private async getLikeCount(articleId: string): Promise<number> {
    const a = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { likeCount: true },
    });
    return a?.likeCount ?? 0;
  }
}
