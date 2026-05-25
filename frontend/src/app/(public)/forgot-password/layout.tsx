import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Sou'Sou",
  description: "Réinitialise ton mot de passe Sou'Sou en quelques secondes.",
};

export default function ForgotLayout({ children }: { children: React.ReactNode }) {
  return children;
}
