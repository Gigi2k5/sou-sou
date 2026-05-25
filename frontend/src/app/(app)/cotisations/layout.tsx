import type { Metadata } from "next";

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
  return children;
}
