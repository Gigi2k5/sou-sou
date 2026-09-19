"use client";

import { ArrowLeft, CheckCircle2, HelpCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { SheetAnalysis } from "@/lib/spreadsheet/analyze";
import { cn } from "@/lib/utils";

interface SheetPickerProps {
  sheets: SheetAnalysis[];
  currency: string;
  onPick: (sheet: SheetAnalysis) => void;
  onCancel: () => void;
}

/**
 * Choix de la feuille, une à la fois.
 *
 * Tout importer d'un coup serait plus rapide à cliquer et bien pire à vivre :
 * chaque feuille devient un lot annulable distinct, donc si octobre est mal lu,
 * on annule octobre et on garde septembre. Un import global ne laisse que le
 * choix de tout perdre.
 *
 * L'écran annonce aussi, AVANT de choisir, ce qui attend l'utilisateur sur
 * chaque feuille : lecture immédiate, lecture non recoupée, ou passage par
 * l'analyse. Personne n'aime découvrir qu'il doit patienter une minute après
 * avoir cliqué.
 */
export function SheetPicker({
  sheets,
  currency,
  onPick,
  onCancel,
}: SheetPickerProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
        <h2 className="mb-1 font-serif text-lg text-sousou-secondary">
          {sheets.length} feuilles dans ce fichier
        </h2>
        <p className="mb-4 text-sm text-sousou-neutral">
          Choisis celle que tu veux importer. Tu pourras revenir faire les
          autres ensuite — une par une, pour pouvoir en annuler une sans perdre
          le reste.
        </p>

        <ul className="space-y-2">
          {sheets.map((s) => (
            <li key={s.sheetName}>
              <button
                type="button"
                onClick={() => onPick(s)}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-xl border border-border/60 p-3 text-left transition-colors",
                  "min-h-11 hover:border-sousou-primary/60 hover:bg-muted/50",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-sousou-secondary">
                    {s.sheetName}
                  </span>
                  <Badge verdict={s.verdict} />
                </div>
                <p className="text-xs text-sousou-neutral">
                  {s.analysis.lines.length > 0
                    ? `${s.analysis.lines.length} ligne${s.analysis.lines.length > 1 ? "s" : ""} · ${formatMoney(s.analysis.totals.expense, currency)} de sorties`
                    : "Aucune transaction reconnue directement"}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full sm:w-auto"
        onClick={onCancel}
      >
        <ArrowLeft className="size-4" />
        Choisir un autre fichier
      </Button>
    </section>
  );
}

function Badge({ verdict }: { verdict: SheetAnalysis["verdict"] }) {
  if (verdict === "reconciled") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        <CheckCircle2 className="size-3" />
        Totaux vérifiés
      </span>
    );
  }
  if (verdict === "unverified") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
        <HelpCircle className="size-3" />
        Sans total à recouper
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
      <Sparkles className="size-3" />
      À analyser
    </span>
  );
}
