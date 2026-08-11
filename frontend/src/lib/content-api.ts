import { api } from "./api";
import type {
  Article,
  ArticleComment,
  ArticleCommentsList,
  ArticleLikeStatus,
  ArticlesList,
  Resource,
  ResourcesList,
} from "@/types/content";

// --- Articles ---------------------------------------------------------------
export async function listArticles(
  q: { page?: number; limit?: number } = {},
): Promise<ArticlesList> {
  const { data } = await api.get<ArticlesList>("/articles", {
    params: {
      ...(q.page ? { page: q.page } : {}),
      ...(q.limit ? { limit: q.limit } : {}),
    },
  });
  return data;
}

export async function getArticle(slug: string): Promise<Article> {
  const { data } = await api.get<Article>(`/articles/${slug}`);
  return data;
}

export interface CreateArticleInput {
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
}
export async function createArticle(input: CreateArticleInput): Promise<Article> {
  const { data } = await api.post<Article>("/articles", input);
  return data;
}

export interface UpdateArticleInput {
  title?: string;
  content?: string;
  excerpt?: string;
  coverImage?: string;
}
export async function updateArticle(
  id: string,
  input: UpdateArticleInput,
): Promise<Article> {
  const { data } = await api.patch<Article>(`/articles/${id}`, input);
  return data;
}

export async function deleteArticle(id: string): Promise<void> {
  await api.delete(`/articles/${id}`);
}

/**
 * Upload une image de couverture sur Cloudinary via le backend et retourne
 * son URL publique. À poser ensuite dans le champ `coverImage` du form.
 */
export async function uploadArticleCover(
  dataUrl: string,
): Promise<{ url: string }> {
  const { data } = await api.post<{ url: string }>("/articles/upload-cover", {
    dataUrl,
  });
  return data;
}

// --- Likes & Comments (V4) -------------------------------------------------

export async function likeArticle(id: string): Promise<ArticleLikeStatus> {
  const { data } = await api.post<ArticleLikeStatus>(`/articles/${id}/like`);
  return data;
}

export async function unlikeArticle(id: string): Promise<ArticleLikeStatus> {
  const { data } = await api.delete<ArticleLikeStatus>(`/articles/${id}/like`);
  return data;
}

export async function listComments(
  articleId: string,
  q: { page?: number; limit?: number } = {},
): Promise<ArticleCommentsList> {
  const { data } = await api.get<ArticleCommentsList>(
    `/articles/${articleId}/comments`,
    {
      params: {
        ...(q.page ? { page: q.page } : {}),
        ...(q.limit ? { limit: q.limit } : {}),
      },
    },
  );
  return data;
}

export async function createComment(
  articleId: string,
  body: string,
): Promise<ArticleComment> {
  const { data } = await api.post<ArticleComment>(
    `/articles/${articleId}/comments`,
    { body },
  );
  return data;
}

export async function updateComment(
  commentId: string,
  body: string,
): Promise<ArticleComment> {
  const { data } = await api.patch<ArticleComment>(
    `/articles/comments/${commentId}`,
    { body },
  );
  return data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/articles/comments/${commentId}`);
}

// --- Resources --------------------------------------------------------------
export async function listResources(
  category?: string | null,
): Promise<ResourcesList> {
  const { data } = await api.get<ResourcesList>("/resources", {
    params: category ? { category } : {},
  });
  return data;
}

export async function createResource(
  youtubeUrl: string,
  category?: string,
  description?: string,
): Promise<Resource> {
  const { data } = await api.post<Resource>("/resources", {
    youtubeUrl,
    ...(category ? { category } : {}),
    ...(description ? { description } : {}),
  });
  return data;
}

export async function deleteResource(id: string): Promise<void> {
  await api.delete(`/resources/${id}`);
}
