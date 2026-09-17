"use client";

import { AlertTriangle, CalendarRange, CheckCircle2, Scale } from "lucide-react";

import { formatMoney } from "@/lib/format";
import type { NotebookVerdict, WeekReport } from "@/lib/import-checks";
import { cn } from "@/lib/utils";

interface AuditSummaryProps {
  verdict: NotebookVerdict | null;
  weeks: WeekReport[];
  currency: string;
}

/**
 * Le verdict d'ensemble : ce que le carnet revendique face à ce qu'il contient.
 *
 * Ce bloc dépasse le cadre de l'import. Les totaux d'un carnet tenu à la main
 * sont eux-mêmes faillibles, et les confronter ligne à ligne révèle des erreurs
 * que son propriétaire traîne parfois depuis des mois. Sur le carnet qui a
 * motivé ce travail : 2 000 F d'écart sur un total hebdomadaire et 50 F sur une
 * journée de vingt lignes — jamais repérés.
 *
 * On ne corrige rien et on ne bloque rien : on montre l'écart et on désigne
 * l'endroit. C'est à l'utilisateur de trancher, c'est son argent.
 */
export function AuditSummary({ verdict, weeks, currency }: AuditSummaryProps) {
  const weeksInGap = weeks.filter((w) => w.hasGap);
  if (!verdict && weeksInGap.length === 0) return null;

  const gap = verdict ? Math.abs(verdict.gap) : 0;
  const mismatch = verdict !== null && !verdict.ok;

  return (
    <section
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        mismatch || weeksInGap.length > 0
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
              value={
                verdict.ok ? "aucun" : formatMoney(gap, currency)
              }
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
                      l&apos;extraction — les lignes ci-dessous sont fidèles.
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
              <li
                key={`${w.from}|${w.to}`}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
              >
                <span className="font-medium text-sousou-secondary">
                  {w.label}
                </span>
                <span className="text-sousou-neutral">
                  annonce{" "}
                  <strong className="tabular-nums">
                    {formatMoney(weekDeclared(w), currency)}
                  </strong>
                  , ses lignes font{" "}
                  <strong className="tabular-nums">
                    {formatMoney(weekComputed(w), currency)}
                  </strong>
                </span>
                <span className="rounded-md bg-amber-200/60 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                  {weekGap(w) > 0 ? "+" : ""}
                  {formatMoney(weekGap(w), currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
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

/**
 * Les trois helpers ci-dessous choisissent la mesure pertinente pour une
 * semaine : le total brut si le carnet n'en écrit qu'un, les sorties sinon.
 * Afficher « sorties » là où le carnet dit « Total » induirait en erreur.
 */
function weekDeclared(w: WeekReport): number {
  return w.declared.gross ?? w.declared.expense ?? 0;
}

function weekComputed(w: WeekReport): number {
  return w.declared.gross !== null ? w.computedGross : w.computedExpense;
}

function weekGap(w: WeekReport): number {
  return (w.declared.gross !== null ? w.grossGap : w.expenseGap) ?? 0;
}
