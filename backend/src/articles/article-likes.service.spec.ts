import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ArticleLikesService } from './article-likes.service';

/**
 * Tests unitaires de la logique métier (mocks Prisma — pas de DB).
 * Couvre : self-like refusé, idempotence, branchement gamification + notif,
 * unlike décrémente le compteur, status renvoie liked/likeCount.
 */

interface FakeArticle {
  id: string;
  authorId: string;
  title: string;
  isHidden: boolean;
  likeCount: number;
}

function makePrismaMock(
  articles: FakeArticle[],
  likes: { articleId: string; userId: string; id: string }[],
) {
  const findArticle = (id: string) => articles.find((a) => a.id === id) ?? null;

  const articleLikeOps = {
    findUnique: jest.fn(
      async ({
        where,
      }: {
        where: { articleId_userId: { articleId: string; userId: string } };
      }) => {
        const k = where.articleId_userId;
        return (
          likes.find(
            (l) => l.articleId === k.articleId && l.userId === k.userId,
          ) ?? null
        );
      },
    ),
    create: jest.fn(
      async ({ data }: { data: { articleId: string; userId: string } }) => {
        const newLike = { id: `like-${likes.length + 1}`, ...data };
        likes.push(newLike);
        return newLike;
      },
    ),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      const idx = likes.findIndex((l) => l.id === where.id);
      if (idx >= 0) likes.splice(idx, 1);
      return {};
    }),
  };

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
        const lc = data.likeCount as
          | { increment?: number; decrement?: number }
          | undefined;
        if (lc?.increment) a.likeCount += lc.increment;
        if (lc?.decrement) a.likeCount -= lc.decrement;
        return { ...a };
      },
    ),
  };

  const userOps = {
    findUnique: jest.fn(async () => ({ name: 'Alice' })),
  };

  // $transaction(fn) → exécute fn avec un client qui partage les mêmes mocks.
  const tx = {
    articleLike: articleLikeOps,
    article: articleOps,
    user: userOps,
  };
  type Tx = typeof tx;

  return {
    article: articleOps,
    articleLike: articleLikeOps,
    user: userOps,
    $transaction: jest.fn(async (fn: (tx: Tx) => Promise<unknown>) => fn(tx)),
  };
}

describe('ArticleLikesService', () => {
  const notifications = {
    create: jest.fn(),
  } as unknown as ConstructorParameters<typeof ArticleLikesService>[1];
  const gamification = {
    applyArticleEngagement: jest.fn(async () => ({
      pointsEarned: 1,
      totalPoints: 1,
      newBadges: [],
    })),
  } as unknown as ConstructorParameters<typeof ArticleLikesService>[2];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejette le self-like avec BadRequestException', async () => {
    const articles: FakeArticle[] = [
      { id: 'a1', authorId: 'u1', title: 'T', isHidden: false, likeCount: 0 },
    ];
    const prisma = makePrismaMock(articles, []);
    const svc = new ArticleLikesService(
      prisma as never,
      notifications,
      gamification,
    );
    await expect(svc.like('u1', 'a1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejette si article introuvable', async () => {
    const prisma = makePrismaMock([], []);
    const svc = new ArticleLikesService(
      prisma as never,
      notifications,
      gamification,
    );
    await expect(svc.like('u2', 'a1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejette si article masqué', async () => {
    const articles: FakeArticle[] = [
      { id: 'a1', authorId: 'u1', title: 'T', isHidden: true, likeCount: 0 },
    ];
    const prisma = makePrismaMock(articles, []);
    const svc = new ArticleLikesService(
      prisma as never,
      notifications,
      gamification,
    );
    await expect(svc.like('u2', 'a1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('like incrémente le count + applique gamification + crée notif', async () => {
    const articles: FakeArticle[] = [
      {
        id: 'a1',
        authorId: 'u1',
        title: 'Test',
        isHidden: false,
        likeCount: 0,
      },
    ];
    const prisma = makePrismaMock(articles, []);
    const svc = new ArticleLikesService(
      prisma as never,
      notifications,
      gamification,
    );

    const r = await svc.like('u2', 'a1');

    expect(r).toEqual({ liked: true, likeCount: 1 });
    expect(articles[0].likeCount).toBe(1);
    expect(gamification.applyArticleEngagement).toHaveBeenCalledWith(
      expect.anything(),
      'u1', // l'auteur reçoit les points
      'LIKE',
      1, // articleLikeCount après incrément
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: 'ARTICLE_LIKED',
      }),
      expect.anything(),
    );
  });

  it('like idempotent : ne re-incrémente pas si déjà liké', async () => {
    const articles: FakeArticle[] = [
      { id: 'a1', authorId: 'u1', title: 'T', isHidden: false, likeCount: 1 },
    ];
    const likes = [{ id: 'l1', articleId: 'a1', userId: 'u2' }];
    const prisma = makePrismaMock(articles, likes);
    const svc = new ArticleLikesService(
      prisma as never,
      notifications,
      gamification,
    );

    const r = await svc.like('u2', 'a1');

    expect(r).toEqual({ liked: true, likeCount: 1 });
    expect(articles[0].likeCount).toBe(1); // pas re-incrémenté
    expect(gamification.applyArticleEngagement).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('unlike décrémente le count', async () => {
    const articles: FakeArticle[] = [
      { id: 'a1', authorId: 'u1', title: 'T', isHidden: false, likeCount: 1 },
    ];
    const likes = [{ id: 'l1', articleId: 'a1', userId: 'u2' }];
    const prisma = makePrismaMock(articles, likes);
    const svc = new ArticleLikesService(
      prisma as never,
      notifications,
      gamification,
    );

    const r = await svc.unlike('u2', 'a1');

    expect(r).toEqual({ liked: false, likeCount: 0 });
    expect(articles[0].likeCount).toBe(0);
    expect(likes.length).toBe(0);
  });

  it('unlike idempotent : si pas liké, no-op et renvoie le count actuel', async () => {
    const articles: FakeArticle[] = [
      { id: 'a1', authorId: 'u1', title: 'T', isHidden: false, likeCount: 5 },
    ];
    const prisma = makePrismaMock(articles, []);
    const svc = new ArticleLikesService(
      prisma as never,
      notifications,
      gamification,
    );

    const r = await svc.unlike('u2', 'a1');
    expect(r).toEqual({ liked: false, likeCount: 5 });
  });

  it('getStatus renvoie liked + count', async () => {
    const articles: FakeArticle[] = [
      { id: 'a1', authorId: 'u1', title: 'T', isHidden: false, likeCount: 3 },
    ];
    const likes = [{ id: 'l1', articleId: 'a1', userId: 'u2' }];
    const prisma = makePrismaMock(articles, likes);
    const svc = new ArticleLikesService(
      prisma as never,
      notifications,
      gamification,
    );

    const r = await svc.getStatus('u2', 'a1');
    expect(r).toEqual({ liked: true, likeCount: 3 });
  });
});
