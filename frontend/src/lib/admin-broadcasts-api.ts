import { api } from "./api";
import type {
  BroadcastListItem,
  BroadcastPreview,
  BroadcastSegment,
  BroadcastsList,
  CreateBroadcastInput,
} from "@/types/admin-broadcasts";

export async function listAdminBroadcasts(
  page = 1,
  limit = 20,
): Promise<BroadcastsList> {
  const { data } = await api.get<BroadcastsList>("/admin/broadcasts", {
    params: { page, limit },
  });
  return data;
}

export async function previewBroadcast(
  segment: BroadcastSegment,
): Promise<BroadcastPreview> {
  const { data } = await api.post<BroadcastPreview>(
    "/admin/broadcasts/preview",
    { segment },
  );
  return data;
}

export async function createBroadcast(
  input: CreateBroadcastInput,
): Promise<BroadcastListItem> {
  const { data } = await api.post<BroadcastListItem>(
    "/admin/broadcasts",
    input,
  );
  return data;
}
