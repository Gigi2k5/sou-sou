import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte — Sou'Sou",
  description:
    "Inscris-toi gratuitement à Sou'Sou : tracker, objectifs d'épargne gamifiés et conseils.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
