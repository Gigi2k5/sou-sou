"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdminUserStatus } from "@/types/admin-users";

const STATUS_PILLS: { value: AdminUserStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
  { value: "banned", label: "Bannis" },
];

export function AdminUsersFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  status: AdminUserStatus | "all";
  onStatusChange: (v: AdminUserStatus | "all") => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-sousou-neutral" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Recherche par nom ou email..."
          className="pl-9"
          aria-label="Recherche utilisateurs"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {STATUS_PILLS.map((p) => {
          const active = status === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onStatusChange(p.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-sousou-secondary text-white"
                  : "bg-muted text-sousou-neutral hover:bg-muted/80",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
