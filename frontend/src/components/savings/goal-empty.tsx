"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { Button } from "@/components/ui/button";

export function GoalEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl bg-gradient-to-br from-sousou-primary-50 via-card to-card dark:from-sousou-primary/10 dark:via-card dark:to-card border border-border/60 p-8 sm:p-12 text-center"
    >
      <div className="flex justify-center mb-6">
        <MascotAnimated mood="happy" size="lg" interactive disableConfetti />
      </div>

      <h2 className="font-serif text-2xl sm:text-3xl text-sousou-secondary mb-3 leading-tight">
        Définis ton premier objectif
      </h2>
      <p className="text-sm sm:text-base text-sousou-neutral max-w-md mx-auto mb-6">
        Un voyage, un achat, un fonds d&apos;urgence ? Choisis combien tu veux
        mettre de côté, en combien de temps — Sou&apos;Sou s&apos;occupe du
        rythme et de la motivation.
      </p>

      <Button size="lg" onClick={onCreate} className="px-6">
        <Plus className="size-5" />
        Créer mon objectif
      </Button>
    </motion.div>
  );
}
