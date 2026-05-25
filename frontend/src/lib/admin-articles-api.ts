import { api } from "./api";
import type {
  AdminArticleDetail,
  AdminArticlesList,
  ListAdminArticlesQuery,
} from "@/types/admin-articles";

export async function listAdminArticles(
  q: ListAdminArticlesQuery = {},
): Promise<AdminArticlesList> {
  const { data } = await api.get<AdminArticlesList>("/admin/articles", {
    params: {
      ...(q.page ? { page: q.page } : {}),
      ...(q.limit ? { limit: q.limit } : {}),
      ...(q.search ? { search: q.search } : {}),
      ...(q.tab ? { tab: q.tab } : {}),
    },
  });
  return data;
}

export async function getAdminArticleDetail(
  id: string,
): Promise<AdminArticleDetail> {
  const { data } = await api.get<AdminArticleDetail>(`/admin/articles/${id}`);
  return data;
}

export async function hideAdminArticle(
  id: string,
  reason: string,
): Promise<AdminArticleDetail> {
  const { data } = await api.patch<AdminArticleDetail>(
    `/admin/articles/${id}/hide`,
    { reason },
  );
  return data;
}

export async function unhideAdminArticle(
  id: string,
): Promise<AdminArticleDetail> {
  const { data } = await api.patch<AdminArticleDetail>(
    `/admin/articles/${id}/unhide`,
  );
  return data;
}

export async function deleteAdminArticle(
  id: string,
  reason: string,
): Promise<void> {
  await api.delete(`/admin/articles/${id}`, { data: { reason } });
}

export async function warnArticleAuthor(
  id: string,
  message: string,
): Promise<void> {
  await api.post(`/admin/articles/${id}/warn`, { message });
}
