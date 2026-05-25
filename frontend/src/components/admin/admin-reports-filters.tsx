"use client";

import { cn } from "@/lib/utils";
import type { AdminReportTab } from "@/types/admin-reports";

interface CountsByTab {
  pending: number;
  reviewing: number;
  resolved: number;
  rejected: number;
  total: number;
}

const TABS: { value: AdminReportTab; label: string; key: keyof CountsByTab }[] =
  [
    { value: "pending", label: "À traiter", key: "pending" },
    { value: "reviewing", label: "En cours", key: "reviewing" },
    { value: "resolved", label: "Résolus", key: "resolved" },
    { value: "rejected", label: "Rejetés", key: "rejected" },
    { value: "all", label: "Tous", key: "total" },
  ];

export function AdminReportsFilters({
  tab,
  onTabChange,
  counts,
}: {
  tab: AdminReportTab;
  onTabChange: (v: AdminReportTab) => void;
  counts: CountsByTab;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
      {TABS.map((t) => {
        const active = tab === t.value;
        const count = counts[t.key];
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onTabChange(t.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5",
              active
                ? "bg-sousou-secondary text-white"
                : "bg-muted text-sousou-neutral hover:bg-muted/80",
            )}
          >
            {t.label}
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  active
                    ? "bg-white/20 text-white"
                    : t.value === "pending"
                      ? "bg-sousou-tertiary/20 text-sousou-tertiary"
                      : "bg-card text-sousou-neutral",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
