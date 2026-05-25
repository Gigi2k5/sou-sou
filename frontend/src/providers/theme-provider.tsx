"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Provider next-themes : ajoute la classe `.dark` sur <html> selon la préférence
 * (light/dark/system). next-themes gère le localStorage + le hint OS.
 *
 * `attribute="class"` colle avec notre setup Tailwind v4 (`@custom-variant dark
 * (&:is(.dark *))` dans globals.css).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
