"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdminArticleTab } from "@/types/admin-articles";

const TABS: { value: AdminArticleTab; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "reported", label: "Signalés" },
  { value: "hidden", label: "Masqués" },
];

export function AdminArticlesFilters({
  search,
  onSearchChange,
  tab,
  onTabChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  tab: AdminArticleTab;
  onTabChange: (v: AdminArticleTab) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-sousou-neutral" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Recherche par titre ou auteur..."
          className="pl-9"
          aria-label="Recherche articles"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {TABS.map((t) => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onTabChange(t.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-sousou-secondary text-white"
                  : "bg-muted text-sousou-neutral hover:bg-muted/80",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
