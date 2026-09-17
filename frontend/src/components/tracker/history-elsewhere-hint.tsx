"use client";

import { motion } from "framer-motion";
import { CalendarSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { monthLabel } from "@/components/tracker/range-tabs";

interface HistoryElsewhereHintProps {
  /** Date ISO de la transaction la plus récente, toutes périodes confondues. */
  latestDate: string;
  /** Nombre total de transactions du compte. */
  totalCount: number;
  onShowAll: () => void;
}

/**
 * Signale que le compte contient des données HORS de la période affichée.
 *
 * Un écran à zéro est ambigu : « je n'ai rien saisi » et « je regarde au
 * mauvais endroit » se ressemblent, et rien ne permet de les distinguer. Le
 * second cas est devenu courant avec l'import d'historique — on importe quatre
 * mois de carnet, on atterrit sur le mois courant, et tout indique un échec
 * alors que les données sont bien là.
 *
 * Plutôt que de laisser deviner, on dit ce qu'on sait et on offre le geste.
 */
export function HistoryElsewhereHint({
  latestDate,
  totalCount,
  onShowAll,
}: HistoryElsewhereHintProps) {
  const when = monthLabel(new Date(latestDate));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center dark:border-sky-800/60 dark:bg-sky-950/30"
    >
      <CalendarSearch className="size-5 shrink-0 text-sky-600 dark:text-sky-400" />

      <p className="min-w-0 flex-1 text-sm text-sousou-secondary">
        Rien sur cette période, mais ton compte contient{" "}
        <strong className="tabular-nums">{totalCount}</strong> transaction
        {totalCount > 1 ? "s" : ""} — la plus récente en{" "}
        <strong className="capitalize">{when}</strong>.
      </p>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={onShowAll}
      >
        Tout afficher
      </Button>
    </motion.div>
  );
}
