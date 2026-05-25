import { api } from "./api";
import type {
  AdminResource,
  AdminResourcesList,
  CreateAdminResourceInput,
  UpdateAdminResourceInput,
} from "@/types/admin-resources";

export async function listAdminResources(): Promise<AdminResourcesList> {
  const { data } = await api.get<AdminResourcesList>("/admin/resources");
  return data;
}

export async function createAdminResource(
  input: CreateAdminResourceInput,
): Promise<AdminResource> {
  const { data } = await api.post<AdminResource>("/admin/resources", input);
  return data;
}

export async function updateAdminResource(
  id: string,
  input: UpdateAdminResourceInput,
): Promise<AdminResource> {
  const { data } = await api.patch<AdminResource>(
    `/admin/resources/${id}`,
    input,
  );
  return data;
}

export async function deleteAdminResource(id: string): Promise<void> {
  await api.delete(`/admin/resources/${id}`);
}

export async function reorderAdminResources(
  ids: string[],
): Promise<AdminResourcesList> {
  const { data } = await api.patch<AdminResourcesList>(
    "/admin/resources/reorder",
    { ids },
  );
  return data;
}
