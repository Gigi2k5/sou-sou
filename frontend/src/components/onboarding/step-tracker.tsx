"use client";

import { motion } from "framer-motion";
import { Receipt, TrendingDown, TrendingUp } from "lucide-react";

import { StepShell } from "./step-shell";

const FEATURES = [
  {
    icon: TrendingUp,
    label: "Tes revenus",
    color: "text-sousou-primary",
    bg: "bg-sousou-primary-50 dark:bg-sousou-primary/15",
  },
  {
    icon: TrendingDown,
    label: "Tes dépenses",
    color: "text-sousou-tertiary",
    bg: "bg-sousou-tertiary/10 dark:bg-sousou-tertiary/20",
  },
  {
    icon: Receipt,
    label: "Tes habitudes",
    color: "text-sousou-secondary",
    bg: "bg-muted",
  },
];

export function StepTracker({
  onNext,
  onPrevious,
}: {
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <StepShell
      mood="encouraging"
      title="Suis tes mouvements"
      subtitle="Ajoute tes revenus et dépenses chaque jour. Sou'Sou s'occupe d'analyser tes habitudes et de te montrer où va ton argent."
      onPrimary={onNext}
      onPrevious={onPrevious}
    >
      <ul className="space-y-2.5 max-w-sm mx-auto sm:mx-0">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.li
              key={f.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className={`flex items-center justify-center size-9 rounded-xl ${f.bg} ${f.color}`}
              >
                <Icon className="size-4" />
              </span>
              <span className="font-medium text-sousou-secondary">
                {f.label}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </StepShell>
  );
}
