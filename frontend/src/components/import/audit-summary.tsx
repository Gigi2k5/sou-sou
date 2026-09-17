"use client";

import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Info,
  Scale,
} from "lucide-react";
import { useState } from "react";

import { formatDate, formatMoney } from "@/lib/format";
import type {
  DayReport,
  NotebookVerdict,
  WeekReport,
} from "@/lib/import-checks";
import { cn } from "@/lib/utils";

interface AuditSummaryProps {
  verdict: NotebookVerdict | null;
  weeks: WeekReport[];
  days: DayReport[];
  currency: string;
}

/**
 * Le verdict d'ensemble : ce que le carnet revendique face à ce qu'il contient.
 *
 * Ce bloc dépasse le cadre de l'import. Les totaux d'un carnet tenu à la main
 * sont eux-mêmes faillibles, et les confronter ligne à ligne révèle des erreurs
 * que son propriétaire traîne parfois depuis des mois.
 *
 * On ne corrige rien et on ne bloque rien : on montre l'écart et on désigne
 * l'endroit — jusqu'à la ligne près, en dépliant. Annoncer un écart sans dire
 * où chercher ne sert à rien.
 */
export function AuditSummary({
  verdict,
  weeks,
  days,
  currency,
}: AuditSummaryProps) {
  const weeksInGap = weeks.filter((w) => w.hasGap);
  if (!verdict && weeksInGap.length === 0) return null;

  const gap = verdict ? Math.abs(verdict.gap) : 0;
  const alert = (verdict !== null && !verdict.ok) || weeksInGap.length > 0;

  return (
    <section
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        alert
          ? "border-amber-300 bg-amber-50/70 dark:border-amber-700/60 dark:bg-amber-950/25"
          : "border-emerald-300 bg-emerald-50/70 dark:border-emerald-700/60 dark:bg-emerald-950/25",
      )}
    >
      <header className="mb-3 flex items-center gap-2">
        <Scale className="size-4 text-sousou-primary" />
        <h2 className="font-serif text-lg text-sousou-secondary">
          Les comptes de ton carnet
        </h2>
      </header>

      {verdict && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Figure
              label={
                verdict.source === "weeks"
                  ? "Tes totaux hebdomadaires"
                  : "Ton carnet annonce"
              }
              value={formatMoney(verdict.declared, currency)}
            />
            <Figure
              label={
                verdict.measure === "gross"
                  ? "Somme réelle des lignes"
                  : "Somme réelle des sorties"
              }
              value={formatMoney(verdict.computed, currency)}
            />
            <Figure
              label="Écart"
              value={verdict.ok ? "aucun" : formatMoney(gap, currency)}
              tone={verdict.ok ? "ok" : "warn"}
            />
          </dl>

          <p className="mt-3 flex items-start gap-2 text-sm text-sousou-secondary">
            {verdict.ok ? (
              <>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Tout concorde. Les totaux de ton carnet correspondent
                  exactement à ses lignes.
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  {verdict.gap > 0 ? (
                    <>
                      Tes totaux annoncent{" "}
                      <strong className="tabular-nums">
                        {formatMoney(gap, currency)}
                      </strong>{" "}
                      de plus que la somme de tes lignes. C&apos;est une erreur
                      d&apos;addition <strong>dans le carnet</strong>, pas dans
                      l&apos;extraction.
                    </>
                  ) : (
                    <>
                      Tes lignes font{" "}
                      <strong className="tabular-nums">
                        {formatMoney(gap, currency)}
                      </strong>{" "}
                      de plus que tes totaux. Une ligne a peut-être été comptée
                      deux fois, ou un total oublié.
                    </>
                  )}
                </span>
              </>
            )}
          </p>

          {/* Un carnet s'arrête souvent en plein milieu d'une semaine. Le taire
              laisserait croire que tout a été recoupé — alors qu'une partie des
              lignes n'est confrontée à rien. */}
          {verdict.coverage && verdict.uncoveredLines > 0 && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-card/60 p-2.5 text-xs text-sousou-neutral">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Tes totaux hebdomadaires couvrent du{" "}
                {formatDate(`${verdict.coverage.from}T12:00:00.000Z`)} au{" "}
                {formatDate(`${verdict.coverage.to}T12:00:00.000Z`)}.{" "}
                <strong>{verdict.uncoveredLines}</strong> ligne
                {verdict.uncoveredLines > 1 ? "s" : ""} au-delà n&apos;ont donc
                pas pu être recoupées — elles seront importées quand même.
              </span>
            </p>
          )}
        </>
      )}

      {weeksInGap.length > 0 && (
        <div className="mt-4 border-t border-amber-200/70 pt-3 dark:border-amber-800/50">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sousou-neutral">
            <CalendarRange className="size-3.5" />
            Où ça coince
          </p>
          <ul className="space-y-1.5">
            {weeksInGap.map((w) => (
              <WeekRow
                key={`${w.from}|${w.to}`}
                week={w}
                days={days.filter((d) => d.date >= w.from && d.date <= w.to)}
                currency={currency}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Une semaine fautive, dépliable jusqu'à ses journées puis ses lignes. */
function WeekRow({
  week,
  days,
  currency,
}: {
  week: WeekReport;
  days: DayReport[];
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const declared = week.declared.gross ?? week.declared.expense ?? 0;
  const computed =
    week.declared.gross !== null ? week.computedGross : week.computedExpense;
  const gap = (week.declared.gross !== null ? week.grossGap : week.expenseGap) ?? 0;

  return (
    <li className="rounded-xl bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted/60"
        aria-expanded={open}
      >
        <span className="font-medium text-sousou-secondary">{week.label}</span>
        <span className="text-sousou-neutral">
          annonce{" "}
          <strong className="tabular-nums">
            {formatMoney(declared, currency)}
          </strong>
          , ses lignes font{" "}
          <strong className="tabular-nums">
            {formatMoney(computed, currency)}
          </strong>
        </span>
        <span className="rounded-md bg-amber-200/60 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
          {gap > 0 ? "+" : ""}
          {formatMoney(gap, currency)}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto size-4 shrink-0 text-sousou-neutral transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border/50 px-2.5 py-2">
          <p className="mb-1.5 text-xs text-sousou-neutral">
            Journée par journée. Celles dont l&apos;addition tombe juste sont en
            vert : l&apos;erreur est donc dans le total de la semaine lui-même,
            pas dans ses jours.
          </p>
          <ul className="space-y-1">
            {days.map((d) => (
              <li
                key={d.date}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg px-2 py-1 text-xs odd:bg-muted/40"
              >
                <span className="text-sousou-secondary">
                  {formatDate(`${d.date}T12:00:00.000Z`, { weekday: "short" })}
                </span>
                <span className="tabular-nums text-sousou-neutral">
                  {d.declared.gross !== null && (
                    <>annonce {formatMoney(d.declared.gross, currency)} · </>
                  )}
                  {d.lines.length} ligne{d.lines.length > 1 ? "s" : ""} ={" "}
                  <strong>{formatMoney(d.computedGross, currency)}</strong>{" "}
                  {d.verifiable && (
                    <span
                      className={cn(
                        "ml-1 font-semibold",
                        d.hasGap
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      {d.hasGap ? "écart" : "✓"}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-xl bg-card/70 p-3">
      <dt className="text-xs text-sousou-neutral">{label}</dt>
      <dd
        className={cn(
          "text-sm font-semibold tabular-nums",
          tone === "warn"
            ? "text-amber-700 dark:text-amber-300"
            : tone === "ok"
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-sousou-secondary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
