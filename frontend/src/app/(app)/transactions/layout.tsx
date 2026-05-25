import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transactions — Sou'Sou",
  description: "Toutes tes entrées et sorties d'argent.",
};

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
