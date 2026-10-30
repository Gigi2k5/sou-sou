import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FEATURES } from "@/lib/features";

export const metadata: Metadata = {
  title: "Cotisations — Sou'Sou",
  description:
    "Tes pots solo et de groupe — créez, rejoignez et cotisez ensemble.",
};

export default function CotisationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Retirer l'entrée de navigation ne suffit pas : il reste les favoris, les
  // liens des notifications déjà reçues et l'historique du navigateur. On
  // redirige plutôt que de supprimer les pages — le jour où la fonctionnalité
  // revient, il n'y aura qu'un drapeau à rebasculer.
  if (!FEATURES.cotisations) redirect("/dashboard");

  return children;
}
