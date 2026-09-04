import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vérifie ton email — Sou'Sou",
  description: "Saisis le code à 6 chiffres reçu par email pour activer ton compte Sou'Sou.",
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
