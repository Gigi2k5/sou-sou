import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vidéos — Sou'Sou",
  description: "Une sélection de vidéos pour mieux comprendre l'épargne et l'investissement.",
};

export default function RessourcesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
