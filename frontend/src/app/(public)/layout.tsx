import { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col bg-gradient-to-b from-sousou-primary-50 via-background to-background">
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        {children}
      </main>
      <footer className="text-center text-xs text-sousou-neutral py-6">
        © {new Date().getFullYear()} Sou&apos;Sou — Épargne maline, vie sereine.
      </footer>
    </div>
  );
}
