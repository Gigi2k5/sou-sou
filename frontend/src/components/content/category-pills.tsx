"use client";

import { cn } from "@/lib/utils";

export function CategoryPills({
  categories,
  selected,
  onSelect,
}: {
  categories: string[];
  selected: string | null;
  onSelect: (next: string | null) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
      <Pill
        label="Tout"
        active={selected === null}
        onClick={() => onSelect(null)}
      />
      {categories.map((c) => (
        <Pill
          key={c}
          label={c}
          active={selected === c}
          onClick={() => onSelect(c)}
        />
      ))}
    </div>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors outline-none",
        "focus-visible:ring-3 focus-visible:ring-primary/30",
        active
          ? "bg-sousou-secondary text-white"
          : "bg-card border border-border text-sousou-neutral hover:text-sousou-secondary hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
