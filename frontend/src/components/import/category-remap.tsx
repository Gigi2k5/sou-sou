"use client";

import { ArrowRight, Sparkles } from "lucide-react";

import { CategoryPicker } from "@/components/import/category-picker";
import { formatMoney } from "@/lib/format";
import type { CategoryGroup } from "@/lib/import-checks";

interface CategoryRemapProps {
  groups: CategoryGroup[];
  categoryOptions: string[];
  incomeSourceOptions: string[];
  currency: string;
  /** Réaffecte d'un coup toutes les lignes d'un groupe. */
  onRemap: (
    from: string,
    direction: "income" | "expense",
    to: string | undefined,
  ) => void;
}

/**
 * Réaffectation en masse par catégorie.
 *
 * C'est la correction la plus rentable de tout l'écran. Sur un carnet réel, le
 * modèle range correctement les montants mais se trompe de rangement : un
 * loyer noté « Appartement » atterrit dans « Autre », et « Autre » devient la
 * première catégorie du mois — un tableau de bord inutilisable malgré une
 * extraction parfaite.
 *
 * Trié par montant décroissant : la ligne du haut est toujours celle qui change
 * le plus la lecture du mois.
 */
export function CategoryRemap({
  groups,
  categoryOptions,
  incomeSourceOptions,
  currency,
  onRemap,
}: CategoryRemapProps) {
  if (groups.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <header className="mb-1 flex items-center gap-2">
        <Sparkles className="size-4 text-sousou-primary" />
        <h2 className="font-serif text-lg text-sousou-secondary">
          Vérifie le rangement
        </h2>
      </header>
      <p className="mb-4 text-xs text-sousou-neutral">
        Change une catégorie ici et toutes ses lignes suivent. Les plus gros
        montants sont en haut — ce sont eux qui pèsent sur tes statistiques.
      </p>

      <ul className="space-y-2">
        {groups.map((g) => (
          <li
            key={`${g.direction}:${g.name}`}
            className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-sousou-secondary">
                {g.name}
              </span>
              <span className="block text-xs text-sousou-neutral">
                {g.count} ligne{g.count > 1 ? "s" : ""} ·{" "}
                {g.direction === "income" ? "entrées" : "sorties"}
              </span>
            </span>

            <span className="shrink-0 text-sm font-semibold tabular-nums text-sousou-secondary">
              {formatMoney(g.total, currency)}
            </span>

            <ArrowRight className="hidden size-4 shrink-0 text-sousou-neutral sm:block" />

            <CategoryPicker
              value={g.name === "(sans catégorie)" ? undefined : g.name}
              options={
                g.direction === "income" ? incomeSourceOptions : categoryOptions
              }
              onChange={(to) => onRemap(g.name, g.direction, to)}
              className="w-full sm:w-52"
              ariaLabel={`Réaffecter ${g.name}`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
