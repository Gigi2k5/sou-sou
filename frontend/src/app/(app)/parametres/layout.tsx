import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paramètres — Sou'Sou",
  description: "Profil, sources de revenus et catégories de dépenses.",
};

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return children;
}
