"use client";

import { ArrowUpRight, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/format";
import type { EditableLine } from "@/types/import";

interface UnverifiedDirectionsProps {
  /** Les lignes que le modèle a rangées en entrée. */
  incomeLines: EditableLine[];
  currency: string;
  onFlip: (uid: string) => void;
}

/**
 * Fait confirmer les lignes classées en entrée dans un carnet qui ne distingue
 * pas les sens.
 *
 * Quand un carnet écrit « Total = 10925 », un seul nombre, aucun calcul ne peut
 * valider le sens d'une ligne : basculer une entrée en sortie ne change pas ce
 * total. Les contrôles sont donc aveugles ici, et c'est structurel — pas un
 * défaut à corriger.
 *
 * Or le sens est justement ce que le modèle devine le moins bien. « Merveille
 * remboursement », « Salaire » : impossible de savoir, hors contexte, si
 * l'argent entre ou sort. Un versement de salaire à une employée avait ainsi
 * été compté comme un revenu.
 *
 * Ces lignes sont rares — une ou deux par mois — donc les faire confirmer une
 * par une coûte quelques secondes et évite un solde faux.
 */
export function UnverifiedDirections({
  incomeLines,
  currency,
  onFlip,
}: UnverifiedDirectionsProps) {
  if (incomeLines.length === 0) return null;

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-800/60 dark:bg-sky-950/25 sm:p-5">
      <header className="mb-1 flex items-center gap-2">
        <HelpCircle className="size-4 text-sky-600 dark:text-sky-400" />
        <h2 className="font-serif text-lg text-sousou-secondary">
          {incomeLines.length === 1
            ? "Une ligne à confirmer"
            : `${incomeLines.length} lignes à confirmer`}
        </h2>
      </header>
      <p className="mb-4 text-sm text-sousou-neutral">
        Ton carnet n&apos;écrit qu&apos;un total par jour, sans séparer ce qui
        entre de ce qui sort. Aucun calcul ne peut donc vérifier le sens de ces
        lignes — je les ai comprises comme de l&apos;argent <strong>reçu</strong>,
        mais c&apos;est une supposition.
      </p>

      <ul className="space-y-2">
        {incomeLines.map((line) => (
          <li
            key={line.uid}
            className="flex flex-col gap-2 rounded-xl bg-card p-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <span className="shrink-0 text-xs text-sousou-neutral tabular-nums">
              {formatDate(`${line.date}T12:00:00.000Z`)}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-sm text-sousou-secondary"
              title={line.label}
            >
              {line.label}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              + {formatMoney(line.amount, currency)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => onFlip(line.uid)}
            >
              <ArrowUpRight className="size-3.5" />
              Non, c&apos;est une sortie
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
