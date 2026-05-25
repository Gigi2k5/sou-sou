import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Épargne — Sou'Sou",
  description: "Ton objectif d'épargne, tes streaks et tes badges.",
};

export default function EpargneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
