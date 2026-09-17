"use client";

import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { useState } from "react";

import { LineRow } from "@/components/import/line-row";
import { formatDate, formatMoney } from "@/lib/format";
import type { DayReport } from "@/lib/import-checks";
import { cn } from "@/lib/utils";
import type { EditableLine } from "@/types/import";

interface DayCardProps {
  report: DayReport;
  categoryOptions: string[];
  incomeSourceOptions: string[];
  currency: string;
  /** Les journées en écart s'ouvrent d'office : c'est tout l'objet de l'écran. */
  defaultOpen: boolean;
  onChange: (uid: string, patch: Partial<EditableLine>) => void;
  onDelete: (uid: string) => void;
}

export function DayCard({
  report,
  categoryOptions,
  incomeSourceOptions,
  currency,
  defaultOpen,
  onChange,
  onDelete,
}: DayCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { hasGap, verifiable } = report;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border",
        hasGap
          ? "border-amber-300 bg-amber-50/50 dark:border-amber-700/60 dark:bg-amber-950/20"
          : "border-border/60 bg-card/50",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
        aria-expanded={open}
      >
        {hasGap ? (
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : verifiable ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <span className="size-4 shrink-0" />
        )}

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-sousou-secondary">
            {formatDate(`${report.date}T12:00:00.000Z`, { weekday: "long" })}
          </span>
          <span className="block text-xs text-sousou-neutral">
            {report.lines.length} ligne{report.lines.length > 1 ? "s" : ""}
            {hasGap ? " · à vérifier" : verifiable ? " · vérifiée" : ""}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums text-sousou-secondary">
            {formatMoney(report.computedExpense, currency)}
          </span>
          {report.computedIncome > 0 && (
            <span className="block text-xs tabular-nums text-emerald-700 dark:text-emerald-300">
              +{formatMoney(report.computedIncome, currency)}
            </span>
          )}
        </span>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-sousou-neutral transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* L'explication de l'écart est formulée en langage humain, avec le
          montant manquant en clair. « Il manque 500 F » se corrige ; « checksum
          mismatch » ne se corrige pas. */}
      {hasGap && (
        <div className="border-t border-amber-200 bg-amber-100/60 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-100">
          {/* « toutes lignes confondues » quand le carnet n'écrit qu'un total
              unique : c'est ce qu'il compare lui-même, et ça ne bouge pas quand
              on reclasse une ligne. */}
          <Gap
            label="toutes lignes confondues"
            declared={report.declared.gross}
            computed={report.computedGross}
            gap={report.grossGap}
            currency={currency}
          />
          <Gap
            label="sorties"
            declared={report.declared.expense}
            computed={report.computedExpense}
            gap={report.expenseGap}
            currency={currency}
          />
          <Gap
            label="entrées"
            declared={report.declared.income}
            computed={report.computedIncome}
            gap={report.incomeGap}
            currency={currency}
          />
        </div>
      )}

      {open && (
        <div className="space-y-2 border-t border-border/60 p-3">
          {report.lines.length === 0 ? (
            <p className="py-3 text-center text-xs text-sousou-neutral">
              Toutes les lignes de cette journée ont été retirées.
            </p>
          ) : (
            report.lines.map((line) => (
              <LineRow
                key={line.uid}
                line={line}
                categoryOptions={categoryOptions}
                incomeSourceOptions={incomeSourceOptions}
                currency={currency}
                onChange={onChange}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Gap({
  label,
  declared,
  computed,
  gap,
  currency,
}: {
  label: string;
  declared: number | null;
  computed: number;
  gap: number | null;
  currency: string;
}) {
  if (gap === null || Math.abs(gap) <= 0.5 || declared === null) return null;
  const missing = gap > 0;
  return (
    <p>
      Ton carnet annonce{" "}
      <strong className="tabular-nums">{formatMoney(declared, currency)}</strong> de {label},
      j&apos;ai trouvé{" "}
      <strong className="tabular-nums">{formatMoney(computed, currency)}</strong>.{" "}
      {missing ? "Il manque" : "Il y a en trop"}{" "}
      <strong className="tabular-nums">{formatMoney(Math.abs(gap), currency)}</strong>.
    </p>
  );
}
