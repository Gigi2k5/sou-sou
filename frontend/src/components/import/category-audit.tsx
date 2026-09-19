"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Tags } from "lucide-react";
import { useState } from "react";

import { formatMoney } from "@/lib/format";
import type { CategoryReport } from "@/lib/import-checks";
import { cn } from "@/lib/utils";

interface CategoryAuditProps {
  reports: CategoryReport[];
  currency: string;
}

/**
 * Le contrôle par rubrique — celui que seuls les tableurs permettent.
 *
 * Il ne cherche pas les erreurs de calcul de l'utilisateur : dans un tableur,
 * les totaux sont des formules, donc toujours justes. Il vérifie NOTRE lecture.
 * Et surtout il désigne l'endroit : « il manque 600 F » laisse quarante-huit
 * lignes à relire, « il manque 600 F dans Déplacement » en laisse quatorze.
 *
 * Replié par défaut quand tout tombe juste. Un écran qui déroule onze lignes
 * vertes n'apprend rien à personne et repousse les vraies informations plus bas.
 */
export function CategoryAudit({ reports, currency }: CategoryAuditProps) {
  const [open, setOpen] = useState(false);
  if (reports.length === 0) return null;

  const failing = reports.filter((r) => !r.ok);
  const alert = failing.length > 0;
  const shown = open || alert ? reports : [];

  return (
    <section
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        alert
          ? "border-amber-300 bg-amber-50/70 dark:border-amber-700/60 dark:bg-amber-950/25"
          : "border-border/60 bg-card",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open || alert}
        className="flex min-h-11 w-full items-center gap-2 text-left"
      >
        {alert ? (
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : (
          <Tags className="size-4 shrink-0 text-sousou-primary" />
        )}
        <span className="min-w-0 flex-1 font-serif text-lg text-sousou-secondary">
          {alert
            ? `${failing.length} rubrique${failing.length > 1 ? "s" : ""} ne tombe${failing.length > 1 ? "nt" : ""} pas juste`
            : `${reports.length} rubriques recoupées, toutes justes`}
        </span>
        {!alert && (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-sousou-neutral transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {alert && (
        <p className="mt-1 text-sm text-sousou-neutral">
          Ton fichier annonce un total par rubrique, et ma lecture ne retombe pas
          dessus. L&apos;écart désigne où regarder.
        </p>
      )}

      {shown.length > 0 && (
        <ul className="mt-3 space-y-1">
          {shown.map((r) => (
            <li
              key={`${r.direction}-${r.name}`}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5 text-sm",
                r.ok ? "" : "bg-amber-100/60 dark:bg-amber-900/25",
              )}
            >
              {r.ok ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              )}
              <span className="min-w-0 flex-1 truncate text-sousou-secondary">
                {r.name}
                <span className="ml-1 text-xs text-sousou-neutral">
                  ({r.lineCount})
                </span>
              </span>
              <span className="shrink-0 text-xs text-sousou-neutral tabular-nums">
                annoncé {formatMoney(r.declared, currency)}
              </span>
              {!r.ok && (
                <span className="shrink-0 text-xs font-semibold text-amber-700 tabular-nums dark:text-amber-300">
                  {r.gap > 0 ? "+" : ""}
                  {formatMoney(r.gap, currency)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
