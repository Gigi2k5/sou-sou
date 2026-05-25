import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyses — Sou'Sou",
  description: "Vue détaillée de tes habitudes financières.",
};

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
