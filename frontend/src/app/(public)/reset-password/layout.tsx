import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe — Sou'Sou",
  description: "Choisis un nouveau mot de passe pour ton compte Sou'Sou.",
};

export default function ResetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
