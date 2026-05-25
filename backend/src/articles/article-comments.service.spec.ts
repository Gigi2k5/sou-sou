import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { ArticleCommentsService } from './article-comments.service';

/**
 * Tests unitaires : self-comment sans gamif/notif, branchement gamif/notif sur
 * comment d'un autre user, increment du commentCount, edit/delete par auteur,
 * delete par admin, refus pour les autres.
 */

interface FakeArticle {
  id: string;
  authorId: string;
  title: string;
  isHidden: boolean;
  commentCount: number;
}

interface FakeComment {
  id: string;
  articleId: string;
  authorId: string;
  body: string;
  isHidden: boolean;
}

function makePrismaMock(articles: FakeArticle[], comments: FakeComment[]) {
  const findArticle = (id: string) => articles.find((a) => a.id === id) ?? null;

  const articleOps = {
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
      findArticle(where.id),
    ),
    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const a = findArticle(where.id);
        if (!a) return null;
        const cc = data.commentCount as
          | { increment?: number; decrement?: number }
          | undefined;
        if (cc?.increment) a.commentCount += cc.increment;
        if (cc?.decrement) a.commentCount -= cc.decrement;
        return { ...a };
      },
    ),
  };

  const commentOps = {
    findUnique: jest.fn(
      async ({ where }: { where: { id: string } }) =>
        comments.find((c) => c.id === where.id) ?? null,
    ),
    findMany: jest.fn(async () => comments),
    count: jest.fn(async () => comments.length),
    create: jest.fn(
      async ({
        data,
      }: {
        data: { articleId: string; authorId: string; body: string };
      }) => {
        const c: FakeComment = {
          id: `c-${comments.length + 1}`,
          articleId: data.articleId,
          authorId: data.authorId,
          body: data.body,
          isHidden: false,
        };
        comments.push(c);
        return {
          id: c.id,
          articleId: c.articleId,
          body: c.body,
          isHidden: c.isHidden,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: c.authorId, name: 'X', avatarUrl: null },
        };
      },
    ),
    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { body: string };
      }) => {
        const c = comments.find((x) => x.id === where.id);
        if (!c) return null;
        c.body = data.body;
        return {
          id: c.id,
          articleId: c.articleId,
          body: c.body,
          isHidden: c.isHidden,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: c.authorId, name: 'X', avatarUrl: null },
        };
      },
    ),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      const idx = comments.findIndex((c) => c.id === where.id);
      if (idx >= 0) comments.splice(idx, 1);
      return {};
    }),
  };

  const userOps = {
    findUnique: jest.fn(async () => ({ name: 'Bob' })),
  };

  const tx = {
    articleComment: commentOps,
    article: articleOps,
    user: userOps,
  };
  type Tx = typeof tx;

  return {
    article: articleOps,
    articleComment: commentOps,
    user: userOps,
    $transaction: jest.fn(async (fn: (tx: Tx) => Promise<unknown>) => fn(tx)),
  };
}

describe('ArticleCommentsService', () => {
  const notifications = {
    create: jest.fn(),
  } as unknown as ConstructorParameters<typeof ArticleCommentsService>[1];
  const gamification = {
    applyArticleEngagement: jest.fn(async () => ({
      pointsEarned: 3,
      totalPoints: 3,
      newBadges: [],
    })),
  } as unknown as ConstructorParameters<typeof ArticleCommentsService>[2];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejette si article introuvable', async () => {
    const prisma = makePrismaMock([], []);
    const svc = new ArticleCommentsService(
      prisma as never,
      notifications,
      gamification,
    );
    await expect(
      svc.create('u1', 'a-missing', { body: 'salut' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('comment d’un autre user incrémente count + gamif +3 + notif', async () => {
    const articles: FakeArticle[] = [
      {
        id: 'a1',
        authorId: 'u1',
        title: 'T',
        isHidden: false,
        commentCount: 0,
      },
    ];
    const prisma = makePrismaMock(articles, []);
    const svc = new ArticleCommentsService(
      prisma as never,
      notifications,
      gamification,
    );

    await svc.create('u2', 'a1', { body: 'top !' });

    expect(articles[0].commentCount).toBe(1);
    expect(gamification.applyArticleEngagement).toHaveBeenCalledWith(
      expect.anything(),
      'u1',
      'COMMENT',
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', type: 'ARTICLE_COMMENTED' }),
      expect.anything(),
    );
  });

  it('self-comment : incrément count mais ni gamif ni notif', async () => {
    const articles: FakeArticle[] = [
      {
        id: 'a1',
        authorId: 'u1',
        title: 'T',
        isHidden: false,
        commentCount: 0,
      },
    ];
    const prisma = makePrismaMock(articles, []);
    const svc = new ArticleCommentsService(
      prisma as never,
      notifications,
      gamification,
    );

    await svc.create('u1', 'a1', { body: 'note de l’auteur' });

    expect(articles[0].commentCount).toBe(1);
    expect(gamification.applyArticleEngagement).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('update : auteur peut modifier', async () => {
    const articles: FakeArticle[] = [
      {
        id: 'a1',
        authorId: 'u1',
        title: 'T',
        isHidden: false,
        commentCount: 1,
      },
    ];
    const comments: FakeComment[] = [
      {
        id: 'c1',
        articleId: 'a1',
        authorId: 'u2',
        body: 'orig',
        isHidden: false,
      },
    ];
    const prisma = makePrismaMock(articles, comments);
    const svc = new ArticleCommentsService(
      prisma as never,
      notifications,
      gamification,
    );

    const r = await svc.update({ id: 'u2', role: Role.USER }, 'c1', {
      body: 'edit',
    });
    expect(r.body).toBe('edit');
  });

  it('update : un autre user que l’auteur → ForbiddenException', async () => {
    const articles: FakeArticle[] = [
      {
        id: 'a1',
        authorId: 'u1',
        title: 'T',
        isHidden: false,
        commentCount: 1,
      },
    ];
    const comments: FakeComment[] = [
      {
        id: 'c1',
        articleId: 'a1',
        authorId: 'u2',
        body: 'orig',
        isHidden: false,
      },
    ];
    const prisma = makePrismaMock(articles, comments);
    const svc = new ArticleCommentsService(
      prisma as never,
      notifications,
      gamification,
    );

    await expect(
      svc.update({ id: 'u3', role: Role.USER }, 'c1', { body: 'edit' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('delete : auteur peut supprimer + count décrémenté', async () => {
    const articles: FakeArticle[] = [
      {
        id: 'a1',
        authorId: 'u1',
        title: 'T',
        isHidden: false,
        commentCount: 1,
      },
    ];
    const comments: FakeComment[] = [
      { id: 'c1', articleId: 'a1', authorId: 'u2', body: 'x', isHidden: false },
    ];
    const prisma = makePrismaMock(articles, comments);
    const svc = new ArticleCommentsService(
      prisma as never,
      notifications,
      gamification,
    );

    await svc.remove({ id: 'u2', role: Role.USER }, 'c1');

    expect(comments.length).toBe(0);
    expect(articles[0].commentCount).toBe(0);
  });

  it('delete : admin peut supprimer le commentaire d’un autre', async () => {
    const articles: FakeArticle[] = [
      {
        id: 'a1',
        authorId: 'u1',
        title: 'T',
        isHidden: false,
        commentCount: 1,
      },
    ];
    const comments: FakeComment[] = [
      { id: 'c1', articleId: 'a1', authorId: 'u2', body: 'x', isHidden: false },
    ];
    const prisma = makePrismaMock(articles, comments);
    const svc = new ArticleCommentsService(
      prisma as never,
      notifications,
      gamification,
    );

    await svc.remove({ id: 'u-admin', role: Role.ADMIN }, 'c1');
    expect(comments.length).toBe(0);
  });

  it('delete : un user non-auteur non-admin → ForbiddenException', async () => {
    const articles: FakeArticle[] = [
      {
        id: 'a1',
        authorId: 'u1',
        title: 'T',
        isHidden: false,
        commentCount: 1,
      },
    ];
    const comments: FakeComment[] = [
      { id: 'c1', articleId: 'a1', authorId: 'u2', body: 'x', isHidden: false },
    ];
    const prisma = makePrismaMock(articles, comments);
    const svc = new ArticleCommentsService(
      prisma as never,
      notifications,
      gamification,
    );

    await expect(
      svc.remove({ id: 'u3', role: Role.USER }, 'c1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
