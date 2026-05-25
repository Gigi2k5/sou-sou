"use client";

import { motion } from "framer-motion";
import { ChevronRight, Ban, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatDateRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminUserListItem } from "@/types/admin-users";

export function AdminUsersList({ users }: { users: AdminUserListItem[] }) {
  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-sousou-neutral">
          Aucun utilisateur ne correspond à ces critères.
        </p>
      </div>
    );
  }
  return (
    <>
      {/* Mobile/tablet : cards verticales */}
      <ul className="lg:hidden space-y-2">
        {users.map((u, i) => (
          <motion.li
            key={u.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 * i, duration: 0.2 }}
          >
            <Link
              href={`/admin/users/${u.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 hover:bg-muted/40 transition-colors"
            >
              <Avatar avatarUrl={u.avatarUrl} name={u.name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-sousou-secondary truncate">
                    {u.name}
                  </span>
                  {u.role === "ADMIN" && (
                    <span className="text-[9px] uppercase tracking-wide bg-sousou-secondary text-white rounded px-1.5 py-0.5 shrink-0">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-xs text-sousou-neutral truncate">
                  {u.email}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={u.status} />
                  <span className="text-[11px] text-sousou-neutral tabular-nums">
                    {u.totalPoints} pts
                  </span>
                  <span className="text-[11px] text-sousou-neutral">
                    {u.lastLoginAt
                      ? formatDateRelative(u.lastLoginAt)
                      : "Jamais connecté"}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 text-sousou-neutral shrink-0" />
            </Link>
          </motion.li>
        ))}
      </ul>

      {/* Desktop : table */}
      <div className="hidden lg:block rounded-2xl border border-border/60 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-sousou-neutral text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="text-left px-4 py-3">Utilisateur</th>
              <th className="text-left px-4 py-3">Devise</th>
              <th className="text-right px-4 py-3">Points</th>
              <th className="text-left px-4 py-3">Inscrit</th>
              <th className="text-left px-4 py-3">Dernière connexion</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center gap-3 min-w-0"
                  >
                    <Avatar
                      avatarUrl={u.avatarUrl}
                      name={u.name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sousou-secondary truncate">
                          {u.name}
                        </span>
                        {u.role === "ADMIN" && (
                          <span className="text-[9px] uppercase tracking-wide bg-sousou-secondary text-white rounded px-1.5 py-0.5">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-sousou-neutral truncate">
                        {u.email}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sousou-neutral">{u.currency}</td>
                <td className="px-4 py-3 text-right tabular-nums text-sousou-secondary font-semibold">
                  {u.totalPoints.toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-sousou-neutral">
                  {formatDate(u.createdAt)}
                </td>
                <td className="px-4 py-3 text-sousou-neutral">
                  {u.lastLoginAt
                    ? formatDateRelative(u.lastLoginAt)
                    : "Jamais"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-xs font-semibold text-sousou-primary-700 hover:underline"
                  >
                    Voir →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: AdminUserListItem["status"] }) {
  const config = {
    active: {
      label: "Actif",
      icon: CheckCircle2,
      cls: "bg-sousou-primary-50 text-sousou-primary-700",
    },
    inactive: {
      label: "Inactif",
      icon: null,
      cls: "bg-muted text-sousou-neutral",
    },
    banned: {
      label: "Banni",
      icon: Ban,
      cls: "bg-sousou-tertiary/10 text-sousou-tertiary",
    },
  } as const;
  const c = config[status];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        c.cls,
      )}
    >
      {Icon && <Icon className="size-3" />}
      {c.label}
    </span>
  );
}
