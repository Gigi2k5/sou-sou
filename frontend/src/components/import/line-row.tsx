"use client";

import { ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";

import { CategoryPicker } from "@/components/import/category-picker";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EditableLine } from "@/types/import";

interface LineRowProps {
  line: EditableLine;
  categoryOptions: string[];
  incomeSourceOptions: string[];
  currency: string;
  onChange: (uid: string, patch: Partial<EditableLine>) => void;
  onDelete: (uid: string) => void;
}

export function LineRow({
  line,
  categoryOptions,
  incomeSourceOptions,
  currency,
  onChange,
  onDelete,
}: LineRowProps) {
  const isIncome = line.direction === "income";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:gap-3">
      {/* Bascule entrée / sortie. C'est LA correction la plus fréquente : un
          libellé comme « remboursement » est indécidable hors contexte, et
          c'est exactement ce que l'écart de total révèle. */}
      <button
        type="button"
        onClick={() =>
          onChange(line.uid, {
            direction: isIncome ? "expense" : "income",
            // La catégorie ne survit pas au changement de sens : les catégories
            // de dépense et les sources de revenu sont deux référentiels
            // distincts, en conserver une donnerait une valeur hors-sujet.
            category: undefined,
          })
        }
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
          isIncome
            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200"
            : "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-200",
        )}
        title="Basculer entrée / sortie"
      >
        {isIncome ? (
          <ArrowDownLeft className="size-3.5" />
        ) : (
          <ArrowUpRight className="size-3.5" />
        )}
        {isIncome ? "Entrée" : "Sortie"}
      </button>

      <p className="min-w-0 flex-1 truncate text-sm text-sousou-secondary" title={line.label}>
        {line.label}
      </p>

      <p
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          isIncome ? "text-emerald-700 dark:text-emerald-300" : "text-sousou-secondary",
        )}
      >
        {formatMoney(line.amount, currency)}
      </p>

      <CategoryPicker
        value={line.category}
        options={isIncome ? incomeSourceOptions : categoryOptions}
        onChange={(name) => onChange(line.uid, { category: name })}
        className="w-full sm:w-48"
        ariaLabel={`Catégorie de ${line.label}`}
      />

      <button
        type="button"
        onClick={() => onDelete(line.uid)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-sousou-neutral transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30"
        aria-label={`Supprimer ${line.label}`}
        title="Ne pas importer cette ligne"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
