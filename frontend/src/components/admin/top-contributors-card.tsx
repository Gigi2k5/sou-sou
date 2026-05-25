import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import type { AdminOverviewStats } from "@/types/admin";

export function TopContributorsCard({
  users,
}: {
  users: AdminOverviewStats["topActiveUsers"];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <h2 className="font-serif text-lg text-sousou-secondary mb-1">
        Top contributeurs
      </h2>
      <p className="text-xs text-sousou-neutral mb-3">
        Plus actifs ces 7 derniers jours
      </p>
      {users.length === 0 ? (
        <p className="text-sm text-sousou-neutral text-center py-6">
          Aucune activité ces 7 derniers jours.
        </p>
      ) : (
        <ul className="space-y-2">
          {users.map((u, i) => (
            <li
              key={u.userId}
              className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/40 transition-colors"
            >
              <span className="w-5 text-sm font-bold text-sousou-neutral tabular-nums shrink-0">
                {i + 1}
              </span>
              <Avatar avatarUrl={u.avatarUrl} name={u.name} size="sm" />
              <Link
                href={`/admin/users/${u.userId}`}
                className="flex-1 min-w-0 text-sm font-semibold text-sousou-secondary hover:text-sousou-primary-700 truncate"
              >
                {u.name}
              </Link>
              <span className="text-sm font-semibold text-sousou-primary-700 tabular-nums shrink-0">
                {u.totalActions}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
