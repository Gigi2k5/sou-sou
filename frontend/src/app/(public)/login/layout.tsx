import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — Sou'Sou",
  description:
    "Connecte-toi à Sou'Sou pour reprendre ton suivi d'épargne et tes objectifs.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
