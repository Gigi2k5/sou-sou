import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Sou'Sou",
  description: "Vue d'ensemble de tes finances et de ton épargne.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
