"use client";

import { motion } from "framer-motion";
import { Award, PiggyBank, Target, Users } from "lucide-react";

import { StepShell } from "./step-shell";

const FEATURES = [
  {
    icon: PiggyBank,
    title: "Objectif d'épargne",
    body: "Définis un montant cible — Sou'Sou suit ta progression jour après jour.",
  },
  {
    icon: Users,
    title: "Cotisations entre amis",
    body: "Crée un pot commun pour mutualiser une dépense (loyer, voyage, projet).",
  },
  {
    icon: Award,
    title: "Badges & gamification",
    body: "Streaks, paliers de points, articles populaires... reste motivé⋅e.",
  },
];

export function StepSavings({
  onNext,
  onPrevious,
}: {
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <StepShell
      mood="encouraging"
      title="Avance vers tes objectifs"
      subtitle={
        <>
          Que ce soit pour un{" "}
          <span className="font-semibold text-sousou-secondary inline-flex items-center gap-1">
            <Target className="size-3.5 text-sousou-primary" />
            achat
          </span>
          , un projet ou juste un coussin de sécurité — on est avec toi.
        </>
      }
      onPrimary={onNext}
      onPrevious={onPrevious}
    >
      <ul className="space-y-3 max-w-sm mx-auto sm:mx-0">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="rounded-2xl border border-border/60 bg-card/60 p-3 flex items-start gap-3"
            >
              <span className="flex items-center justify-center size-9 rounded-xl bg-sousou-primary-50 text-sousou-primary-700 dark:bg-sousou-primary/15 shrink-0 mt-0.5">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sousou-secondary">
                  {f.title}
                </p>
                <p className="text-xs text-sousou-neutral leading-relaxed mt-0.5">
                  {f.body}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </StepShell>
  );
}
