import { api } from "./api";
import type {
  AdminUserDetail,
  AdminUsersList,
  ListAdminUsersQuery,
} from "@/types/admin-users";

export async function listAdminUsers(
  q: ListAdminUsersQuery = {},
): Promise<AdminUsersList> {
  const { data } = await api.get<AdminUsersList>("/admin/users", {
    params: {
      ...(q.page ? { page: q.page } : {}),
      ...(q.limit ? { limit: q.limit } : {}),
      ...(q.search ? { search: q.search } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.currency ? { currency: q.currency } : {}),
      ...(q.sortBy ? { sortBy: q.sortBy } : {}),
      ...(q.order ? { order: q.order } : {}),
    },
  });
  return data;
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetail> {
  const { data } = await api.get<AdminUserDetail>(`/admin/users/${id}`);
  return data;
}

export async function banAdminUser(
  id: string,
  reason: string,
): Promise<void> {
  await api.patch(`/admin/users/${id}/ban`, { reason });
}

export async function unbanAdminUser(id: string): Promise<void> {
  await api.patch(`/admin/users/${id}/unban`);
}

export async function updateAdminUserRole(
  id: string,
  role: "USER" | "ADMIN",
): Promise<void> {
  await api.patch(`/admin/users/${id}/role`, { role });
}

export async function deleteAdminUser(
  id: string,
  confirmEmail: string,
): Promise<void> {
  await api.delete(`/admin/users/${id}`, { data: { confirmEmail } });
}
