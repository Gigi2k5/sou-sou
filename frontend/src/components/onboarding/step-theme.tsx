"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { StepShell } from "./step-shell";

type ThemeValue = "light" | "dark" | "system";

const OPTIONS: { value: ThemeValue; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
];

export function StepTheme({
  onNext,
  onPrevious,
}: {
  onNext: () => void;
  onPrevious: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const { user, refresh } = useAuth();
  const current = (theme as ThemeValue) ?? "system";

  const [pending, setPending] = useState(false);

  async function selectTheme(v: ThemeValue) {
    setTheme(v);
    setPending(true);
    try {
      if (user) {
        await api.patch("/users/me", { theme: v });
        await refresh();
      }
    } catch {
      // local-first : silent fail, le thème est appliqué côté client.
    } finally {
      setPending(false);
    }
  }

  return (
    <StepShell
      mood="thinking"
      title="Choisis ton ambiance"
      subtitle="Tu pourras la changer à tout moment depuis tes paramètres."
      onPrimary={onNext}
      onPrevious={onPrevious}
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-sm mx-auto sm:mx-0">
        {OPTIONS.map((o, i) => {
          const Icon = o.icon;
          const active = current === o.value;
          return (
            <motion.button
              key={o.value}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.07 }}
              onClick={() => void selectTheme(o.value)}
              disabled={pending}
              className={cn(
                "rounded-2xl border-2 p-3 sm:p-4 flex flex-col items-center gap-2 transition-all",
                "focus:outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
                active
                  ? "border-sousou-primary bg-sousou-primary-50/60 dark:bg-sousou-primary/10"
                  : "border-border/60 hover:border-sousou-primary/40 hover:bg-muted/50",
                pending && "opacity-70 cursor-wait",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center size-10 sm:size-12 rounded-xl",
                  active
                    ? "bg-sousou-primary text-white"
                    : "bg-muted text-sousou-neutral",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-semibold text-sousou-secondary">
                {o.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </StepShell>
  );
}
