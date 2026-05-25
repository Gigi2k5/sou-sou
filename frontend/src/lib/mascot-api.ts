import { api } from "./api";
import type { MascotContext, MascotMessage } from "@/types/mascot";

export async function getMascotMessage(
  context: MascotContext,
): Promise<MascotMessage> {
  const { data } = await api.get<MascotMessage>("/mascot/message", {
    params: { context },
  });
  return data;
}
