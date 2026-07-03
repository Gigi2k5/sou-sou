"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type ThemeValue = "light" | "dark" | "system";

const ORDER: ThemeValue[] = ["light", "dark", "system"];

const ICONS: Record<ThemeValue, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<ThemeValue, string> = {
  light: "Clair",
  dark: "Sombre",
  system: "Système",
};

/**
 * Bascule entre Light → Dark → System à chaque clic.
 *
 * Synchronise la préférence en base (PATCH /users/me) si l'user est connecté,
 * pour que le choix suive l'utilisateur entre devices. next-themes gère déjà
 * le localStorage côté client (résilience si le user n'est pas authentifié
 * ou si le backend est offline).
 */
export function ThemeToggle({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "labeled";
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const { user, refresh } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Évite le mismatch SSR : on rend une icône neutre tant que mount n'a pas eu lieu.
  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (mounted ? (theme as ThemeValue) ?? "system" : "system");
  const Icon = ICONS[current];

  async function cycleTheme() {
    const idx = ORDER.indexOf(current);
    const next = ORDER[(idx + 1) % ORDER.length];
    setTheme(next);

    // Persiste côté serveur si l'user est connecté (best-effort, silent fail).
    if (user) {
      try {
        await api.patch("/users/me", { theme: next });
        await refresh();
      } catch {
        // L'option reste appliquée localement via localStorage.
      }
    }
  }

  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={cycleTheme}
        aria-label={`Thème actuel : ${LABELS[current]}. Cliquer pour basculer.`}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
          "text-sousou-neutral hover:bg-muted hover:text-sousou-secondary transition-colors",
          className,
        )}
      >
        <span className="relative size-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Icon className="size-5" />
            </motion.span>
          </AnimatePresence>
        </span>
        <span>Thème : {LABELS[current]}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Thème actuel : ${LABELS[current]}. Cliquer pour basculer.`}
      title={`Thème : ${LABELS[current]}`}
      className={cn(
        "relative size-9 rounded-lg flex items-center justify-center",
        "text-sousou-neutral hover:bg-muted hover:text-sousou-secondary transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Icon className="size-5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
