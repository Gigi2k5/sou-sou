import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Sou'Sou",
  description: "Astuces d'épargne et témoignages partagés par la communauté.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
