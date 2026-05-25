"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Couleurs adaptées au thème actif pour les charts recharts. À utiliser dans
 * les `tick.fill`, `stroke` du grid, et le `contentStyle` du Tooltip.
 *
 * Pendant la phase pré-mount (SSR), on retourne les valeurs light pour éviter
 * un flash de mauvaises couleurs ; next-themes ré-rend dès qu'il a accès au
 * localStorage.
 */
export interface ChartColors {
  axis: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const LIGHT: ChartColors = {
  axis: "#5C6360",
  grid: "#E2E8F0",
  tooltipBg: "#FFFFFF",
  tooltipBorder: "#E2E8F0",
  tooltipText: "#1E293B",
};

const DARK: ChartColors = {
  axis: "#94A3B8",
  grid: "#334155",
  tooltipBg: "#1E293B",
  tooltipBorder: "#334155",
  tooltipText: "#F1F5F9",
};

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return LIGHT;
  return resolvedTheme === "dark" ? DARK : LIGHT;
}
