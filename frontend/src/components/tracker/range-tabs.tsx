"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import {
  addMonths,
  endOfDay,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export type RangeKey = "week" | "month" | "3months" | "all";

export interface DateRange {
  key: RangeKey;
  label: string;
  from: Date;
  to: Date;
}

/**
 * Borne basse de la plage « Tout ». Antérieure à toute donnée possible : un
 * import d'historique rejette déjà les dates avant 2000.
 */
const ALL_TIME_START = new Date(Date.UTC(1999, 0, 1));

/**
 * Construit la plage de dates interrogée par les écrans.
 *
 * `monthOffset` ne vaut que pour la clé `month` : 0 = mois courant, -1 = le
 * précédent, etc.
 *
 * ⚠️ Avant, les trois plages étaient toutes ancrées sur AUJOURD'HUI, et la plus
 * large remontait à trois mois. Tant qu'on ne faisait que saisir au fil de
 * l'eau, ça suffisait — les données étaient forcément récentes. L'import
 * d'historique a changé la donne : il crée des transactions anciennes, et
 * celles-ci devenaient littéralement inatteignables. Un carnet de mai importé
 * en septembre n'était affichable par AUCUNE combinaison de clics.
 *
 * D'où l'ajout de `all` et de la navigation mois par mois.
 */
export function buildRange(key: RangeKey, monthOffset = 0): DateRange {
  const now = new Date();

  if (key === "week") {
    return {
      key,
      label: "cette semaine",
      from: startOfWeek(now),
      to: endOfDay(now),
    };
  }

  if (key === "3months") {
    return {
      key,
      label: "3 derniers mois",
      from: startOfMonth(addMonths(now, -2)),
      to: endOfMonth(now),
    };
  }

  if (key === "all") {
    return {
      key,
      label: "tout l'historique",
      from: ALL_TIME_START,
      // Marge vers l'avant : une transaction peut être datée dans le futur
      // (échéance prévue, import d'un mois en cours).
      to: endOfMonth(addMonths(now, 12)),
    };
  }

  const target = addMonths(now, monthOffset);
  return {
    key: "month",
    label: monthOffset === 0 ? "ce mois" : monthLabel(target),
    from: startOfMonth(target),
    to: endOfMonth(target),
  };
}

/** « mai 2026 ». */
export function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(d);
}

interface RangeTabsProps {
  value: RangeKey;
  onChange: (next: RangeKey) => void;
  /** 0 = mois courant. Ignoré hors de la clé `month`. */
  monthOffset?: number;
  /** Fourni → les flèches de navigation apparaissent sur l'onglet « Mois ». */
  onMonthOffsetChange?: (next: number) => void;
}

export function RangeTabs({
  value,
  onChange,
  monthOffset = 0,
  onMonthOffsetChange,
}: RangeTabsProps) {
  const navigable = value === "month" && onMonthOffsetChange !== undefined;
  const current = addMonths(new Date(), monthOffset);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tabs
        value={value}
        onValueChange={(v) => {
          const next = String(v) as RangeKey;
          // Repartir du mois courant en changeant d'onglet : revenir sur
          // « Mois » et retomber trois mois en arrière sans l'avoir demandé
          // serait déroutant.
          onMonthOffsetChange?.(0);
          onChange(next);
        }}
      >
        <TabsList>
          <TabsTab value="week">Semaine</TabsTab>
          <TabsTab value="month">Mois</TabsTab>
          <TabsTab value="3months">3 mois</TabsTab>
          <TabsTab value="all">Tout</TabsTab>
        </TabsList>
      </Tabs>

      {navigable && (
        <div className="flex items-center gap-0.5 rounded-xl border border-border/60 bg-card px-1 py-0.5">
          <NavButton
            label="Mois précédent"
            onClick={() => onMonthOffsetChange(monthOffset - 1)}
          >
            <ChevronLeft className="size-4" />
          </NavButton>

          <span className="min-w-[7.5rem] px-1 text-center text-xs font-medium capitalize text-sousou-secondary tabular-nums">
            {monthLabel(current)}
          </span>

          {/* Pas de navigation vers le futur : il n'y a rien à y voir, et un
              bouton qui ne change rien à l'écran passe pour cassé. */}
          <NavButton
            label="Mois suivant"
            disabled={monthOffset >= 0}
            onClick={() => onMonthOffsetChange(monthOffset + 1)}
          >
            <ChevronRight className="size-4" />
          </NavButton>
        </div>
      )}
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg transition-colors",
        "text-sousou-neutral hover:bg-muted hover:text-sousou-secondary",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      {children}
    </button>
  );
}
