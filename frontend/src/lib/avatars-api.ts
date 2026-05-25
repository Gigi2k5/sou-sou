import { api } from "./api";
import type { AvatarStatus } from "@/types/avatar";

export async function listMyAvatars(): Promise<AvatarStatus[]> {
  const { data } = await api.get<{ avatars: AvatarStatus[] }>(
    "/users/me/avatars",
  );
  return data.avatars;
}
