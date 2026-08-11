import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

import { AvatarUnlocksService } from '../avatar-unlocks/avatar-unlocks.service';
import { PrismaService } from '../prisma/prisma.service';
import { uploadArticleCover } from './cover-image';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { slugify, uniqueSlug } from './slug';

const articleListSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  likeCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.ArticleSelect;

const articleDetailSelect = {
  ...articleListSelect,
  content: true,
  isHidden: true,
} satisfies Prisma.ArticleSelect;

/** Décore une liste d'articles avec `likedByMe` en faisant 1 seule requête. */
async function attachLikedByMe<T extends { id: string }>(
  prisma: PrismaService,
  userId: string,
  articles: T[],
): Promise<(T & { likedByMe: boolean })[]> {
  if (articles.length === 0) return [];
  const likes = await prisma.articleLike.findMany({
    where: {
      userId,
      articleId: { in: articles.map((a) => a.id) },
    },
    select: { articleId: true },
  });
  const likedSet = new Set(likes.map((l) => l.articleId));
  return articles.map((a) => ({ ...a, likedByMe: likedSet.has(a.id) }));
}

function generateExcerpt(content: string): string {
  // Prend les 280 premiers caractères, en sautant les marqueurs markdown courants.
  const stripped = content
    .replace(/^#+\s.*$/gm, '') // headings
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // inline code / fences
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links / images
    .replace(/[*_>~`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > 277
    ? `${stripped.slice(0, 277).trimEnd()}...`
    : stripped;
}

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avatarUnlocks: AvatarUnlocksService,
  ) {}

  async list(user: { id: string; role: Role }, query: ListArticlesDto) {
    // Les admins voient tout. Les users voient les articles publics + leurs propres articles masqués.
    const where: Prisma.ArticleWhereInput =
      user.role === Role.ADMIN
        ? {}
        : { OR: [{ isHidden: false }, { authorId: user.id }] };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        select: articleListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.article.count({ where }),
    ]);
    const decorated = await attachLikedByMe(this.prisma, user.id, items);
    return {
      items: decorated,
      total,
      page: query.page,
      limit: query.limit,
      pageCount: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getBySlug(user: { id: string; role: Role }, slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      select: articleDetailSelect,
    });
    if (!article) throw new NotFoundException('Article introuvable.');
    // Article masqué : visible uniquement par l'auteur et les admins.
    if (
      article.isHidden &&
      user.role !== Role.ADMIN &&
      article.author.id !== user.id
    ) {
      throw new NotFoundException('Article introuvable.');
    }
    const [decorated] = await attachLikedByMe(this.prisma, user.id, [article]);
    return decorated;
  }

  async create(authorId: string, dto: CreateArticleDto) {
    const title = dto.title.trim();
    const slug = await uniqueSlug(title, async (s) => {
      const found = await this.prisma.article.findUnique({
        where: { slug: s },
        select: { id: true },
      });
      return !!found;
    });
    const article = await this.prisma.article.create({
      data: {
        authorId,
        title,
        slug,
        content: dto.content,
        excerpt: dto.excerpt?.trim() || generateExcerpt(dto.content),
        coverImage: dto.coverImage ?? null,
      },
      select: articleDetailSelect,
    });

    // V2.5 : trigger éventuel pour l'avatar "Chouette" (1er article publié).
    await this.avatarUnlocks.checkAndUnlock(authorId);

    // L'auteur ne peut pas liker son propre article — likedByMe = false.
    return { ...article, likedByMe: false };
  }

  async update(
    user: { id: string; role: Role },
    id: string,
    dto: UpdateArticleDto,
  ) {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true, authorId: true, title: true, slug: true },
    });
    if (!existing) throw new NotFoundException('Article introuvable.');
    if (existing.authorId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Tu ne peux modifier que tes propres articles.',
      );
    }

    // Renommage du titre → on régénère le slug si le titre change vraiment.
    let newSlug: string | undefined;
    if (dto.title && slugify(dto.title) !== slugify(existing.title)) {
      newSlug = await uniqueSlug(dto.title, async (s) => {
        if (s === existing.slug) return false;
        const found = await this.prisma.article.findUnique({
          where: { slug: s },
          select: { id: true },
        });
        return !!found;
      });
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(newSlug ? { slug: newSlug } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.excerpt !== undefined
          ? {
              excerpt: dto.excerpt.trim() || generateExcerpt(dto.content ?? ''),
            }
          : dto.content !== undefined
            ? { excerpt: generateExcerpt(dto.content) }
            : {}),
        ...(dto.coverImage !== undefined
          ? { coverImage: dto.coverImage || null }
          : {}),
      },
      select: articleDetailSelect,
    });
    const [decorated] = await attachLikedByMe(this.prisma, user.id, [updated]);
    return decorated;
  }

  /**
   * Upload une image de couverture d'article sur Cloudinary et retourne son URL
   * publique. Le front pose ensuite cette URL dans le champ `coverImage` du
   * formulaire d'article — ce qui persiste comme n'importe quelle URL externe.
   */
  async uploadCover(authorId: string, dataUrl: string): Promise<{ url: string }> {
    const url = await uploadArticleCover(authorId, dataUrl);
    return { url };
  }

  async remove(user: { id: string; role: Role }, id: string) {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) throw new NotFoundException('Article introuvable.');
    if (existing.authorId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Tu ne peux supprimer que tes propres articles.',
      );
    }
    await this.prisma.article.delete({ where: { id } });
  }
}
