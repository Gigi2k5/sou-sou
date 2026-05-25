"use client";

import { motion } from "framer-motion";
import { Award, Sparkles } from "lucide-react";

import { StepShell } from "./step-shell";

export function StepDone({
  onComplete,
  loading,
  onPrevious,
}: {
  onComplete: () => void;
  loading: boolean;
  onPrevious: () => void;
}) {
  return (
    <StepShell
      mood="celebrating"
      title="Tout est prêt 🎉"
      subtitle={
        <>
          Tu peux démarrer ton aventure d&apos;épargne dès maintenant. Une
          dernière chose...
        </>
      }
      primaryLabel="C'est parti !"
      primaryLoading={loading}
      onPrimary={onComplete}
      onPrevious={onPrevious}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-sousou-primary/30 bg-gradient-to-br from-sousou-primary-50 via-card to-sousou-tertiary/10 dark:from-sousou-primary/10 dark:via-card dark:to-sousou-tertiary/15 p-4 max-w-sm mx-auto sm:mx-0"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-sousou-primary-700 dark:text-sousou-primary mb-2">
          Cadeau de bienvenue
        </p>
        <ul className="space-y-2 text-sm text-sousou-secondary">
          <li className="flex items-center gap-2.5">
            <span className="flex items-center justify-center size-7 rounded-full bg-sousou-primary text-white shrink-0">
              <Sparkles className="size-3.5" />
            </span>
            <span>
              <span className="font-semibold">+50 points</span> ajoutés à ton compte
            </span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="flex items-center justify-center size-7 rounded-full bg-sousou-tertiary text-white shrink-0">
              <Award className="size-3.5" />
            </span>
            <span>
              Le badge <span className="font-semibold">« Bienvenue »</span> débloqué
            </span>
          </li>
        </ul>
      </motion.div>
    </StepShell>
  );
}
