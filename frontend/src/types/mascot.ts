import type { MascotMood } from "@/components/mascot/mascot-animated";

export type { MascotMood };

export type MascotContext = "dashboard" | "savings" | "recap";

export interface MascotMessage {
  mood: MascotMood;
  message: string;
  emoji?: string;
}
