"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Info,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { CategoryRemap } from "@/components/import/category-remap";
import { DayCard } from "@/components/import/day-card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  buildDayReports,
  declaredByDay,
  groupByCategory,
  totalsOf,
} from "@/lib/import-checks";
import { cn } from "@/lib/utils";
import type { EditableLine, ImportAnalysis } from "@/types/import";

interface ReviewStepProps {
  analysis: ImportAnalysis;
  lines: EditableLine[];
  currency: string;
  committing: boolean;
  onChange: (uid: string, patch: Partial<EditableLine>) => void;
  onDelete: (uid: string) => void;
  onRemap: (
    from: string,
    direction: "income" | "expense",
    to: string | undefined,
  ) => void;
  onBack: () => void;
  onCommit: () => void;
}

export function ReviewStep({
  analysis,
  lines,
  currency,
  committing,
  onChange,
  onDelete,
  onRemap,
  onBack,
  onCommit,
}: ReviewStepProps) {
  const [showAll, setShowAll] = useState(false);

  // Tout est dérivé des lignes courantes, jamais d'un état parallèle : chaque
  // correction met les contrôles à jour dans le même rendu. C'est ce qui rend
  // l'écran vivant — l'écart se résorbe sous les yeux de l'utilisateur.
  const declared = useMemo(
    () => declaredByDay(analysis.checkpoints),
    [analysis.checkpoints],
  );
  const reports = useMemo(
    () => buildDayReports(lines, declared),
    [lines, declared],
  );
  const groups = useMemo(() => groupByCategory(lines), [lines]);
  const totals = useMemo(() => totalsOf(lines), [lines]);

  const flagged = reports.filter((r) => r.hasGap);
  const verified = reports.filter((r) => r.verifiable && !r.hasGap);
  const unverifiable = reports.filter((r) => !r.verifiable);

  const categoryOptions = useMemo(
    () =>
      unique([
        ...analysis.categories.known,
        ...analysis.categories.toCreate,
        ...lines
          .filter((l) => l.direction === "expense")
          .map((l) => l.category),
      ]),
    [analysis.categories, lines],
  );
  const incomeSourceOptions = useMemo(
    () =>
      unique([
        ...analysis.incomeSources.known,
        ...analysis.incomeSources.toCreate,
        ...lines.filter((l) => l.direction === "income").map((l) => l.category),
      ]),
    [analysis.incomeSources, lines],
  );

  const shared = {
    categoryOptions,
    incomeSourceOptions,
    currency,
    onChange,
    onDelete,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pb-28"
    >
      {/* --- Verdict : la première chose qu'on lit --- */}
      <section
        className={cn(
          "rounded-2xl border p-4 sm:p-5",
          flagged.length > 0
            ? "border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/25"
            : "border-emerald-300 bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-950/25",
        )}
      >
        <div className="flex items-start gap-3">
          {flagged.length > 0 ? (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div className="min-w-0">
            <h2 className="font-serif text-lg text-sousou-secondary">
              {flagged.length > 0
                ? `${flagged.length} journée${flagged.length > 1 ? "s" : ""} à vérifier`
                : verified.length > 0
                  ? "Tout est vérifié"
                  : "Analyse terminée"}
            </h2>
            <p className="mt-0.5 text-sm text-sousou-neutral">
              {lines.length} transaction{lines.length > 1 ? "s" : ""}
              {analysis.periodLabel ? ` · ${analysis.periodLabel}` : ""}
              {verified.length > 0 && (
                <>
                  {" · "}
                  <strong className="text-emerald-700 dark:text-emerald-300">
                    {verified.length} journée{verified.length > 1 ? "s" : ""}{" "}
                    dont l&apos;addition tombe juste
                  </strong>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Le carnet ne porte aucun total : on le dit franchement plutôt que de
            laisser croire à une vérification qui n'a pas eu lieu. */}
        {verified.length === 0 && flagged.length === 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-card/60 p-3 text-xs text-sousou-neutral">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Tes notes ne contiennent pas de totaux, je n&apos;ai donc rien pu
              recouper. Parcours les journées ci-dessous avant de valider.
            </span>
          </p>
        )}
      </section>

      {/* --- Les journées en écart, ouvertes d'office --- */}
      {flagged.length > 0 && (
        <section className="space-y-2">
          {flagged.map((r) => (
            <DayCard key={r.date} report={r} defaultOpen {...shared} />
          ))}
        </section>
      )}

      <CategoryRemap
        groups={groups}
        categoryOptions={categoryOptions}
        incomeSourceOptions={incomeSourceOptions}
        currency={currency}
        onRemap={onRemap}
      />

      {/* --- Le reste, replié : on ne noie pas ce qui compte --- */}
      {(verified.length > 0 || unverifiable.length > 0) && (
        <section className="space-y-2">
          {!showAll ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-card/40 px-4 py-3.5 text-sm text-sousou-neutral transition-colors hover:bg-muted/60"
            >
              <Eye className="size-4" />
              Afficher les {verified.length + unverifiable.length} autres
              journées ({lines.length - flagged.reduce((n, r) => n + r.lines.length, 0)}{" "}
              lignes)
            </button>
          ) : (
            <>
              {[...verified, ...unverifiable].map((r) => (
                <DayCard
                  key={r.date}
                  report={r}
                  defaultOpen={false}
                  {...shared}
                />
              ))}
            </>
          )}
        </section>
      )}

      {/* --- Barre d'action fixe : le total à importer reste toujours visible --- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:left-64">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={committing}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Retour</span>
          </Button>

          <div className="min-w-0 flex-1 text-right sm:text-left">
            <p className="truncate text-xs text-sousou-neutral">
              {lines.length} ligne{lines.length > 1 ? "s" : ""} à importer
            </p>
            <p className="truncate text-sm font-semibold tabular-nums text-sousou-secondary">
              {formatMoney(totals.expense, currency)} de sorties
              {totals.income > 0 && (
                <span className="text-emerald-700 dark:text-emerald-300">
                  {" · +"}
                  {formatMoney(totals.income, currency)}
                </span>
              )}
            </p>
          </div>

          <Button
            type="button"
            onClick={onCommit}
            disabled={committing || lines.length === 0}
          >
            {committing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Import…
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Importer
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function unique(values: (string | undefined)[]): string[] {
  return [
    ...new Set(
      values
        .map((v) => v?.trim())
        .filter((v): v is string => !!v && v !== "(sans catégorie)"),
    ),
  ].sort((a, b) => a.localeCompare(b, "fr"));
}
