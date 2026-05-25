import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Badges — Sou'Sou",
  description: "Ta collection de badges débloqués grâce à tes habitudes d'épargne.",
};

export default function BadgesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
