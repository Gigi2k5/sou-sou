"use client";

import { motion } from "framer-motion";
import { ChevronRight, EyeOff, Flag } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminArticleListItem } from "@/types/admin-articles";

export function AdminArticlesList({
  articles,
}: {
  articles: AdminArticleListItem[];
}) {
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-sousou-neutral">
          Aucun article ne correspond à ces critères.
        </p>
      </div>
    );
  }
  return (
    <>
      {/* Mobile/tablet : cards */}
      <ul className="lg:hidden space-y-2">
        {articles.map((a, i) => (
          <motion.li
            key={a.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 * i, duration: 0.2 }}
          >
            <Link
              href={`/admin/articles/${a.id}`}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3 hover:bg-muted/40 transition-colors"
            >
              <Avatar
                avatarUrl={a.author.avatarUrl}
                name={a.author.name}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5">
                  <span className="text-sm font-semibold text-sousou-secondary line-clamp-2">
                    {a.title}
                  </span>
                </div>
                <div className="text-xs text-sousou-neutral truncate mt-0.5">
                  par {a.author.name} · {formatDate(a.createdAt)}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {a.isHidden && <HiddenBadge />}
                  {a.reportCount > 0 && (
                    <ReportBadge count={a.reportCount} />
                  )}
                </div>
              </div>
              <ChevronRight className="size-4 text-sousou-neutral shrink-0 mt-1" />
            </Link>
          </motion.li>
        ))}
      </ul>

      {/* Desktop : table */}
      <div className="hidden lg:block rounded-2xl border border-border/60 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-sousou-neutral text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="text-left px-4 py-3">Article</th>
              <th className="text-left px-4 py-3">Auteur</th>
              <th className="text-left px-4 py-3">Publié</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-right px-4 py-3">Signalements</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {articles.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 max-w-md">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="font-semibold text-sousou-secondary hover:underline line-clamp-2"
                  >
                    {a.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      avatarUrl={a.author.avatarUrl}
                      name={a.author.name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-sousou-secondary truncate">
                        {a.author.name}
                      </div>
                      {a.author.isBanned && (
                        <span className="text-[10px] text-sousou-tertiary uppercase tracking-wide font-semibold">
                          Banni
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sousou-neutral">
                  {formatDate(a.createdAt)}
                </td>
                <td className="px-4 py-3">
                  {a.isHidden ? (
                    <HiddenBadge />
                  ) : (
                    <span className="text-xs text-sousou-neutral">Visible</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {a.reportCount > 0 ? (
                    <ReportBadge count={a.reportCount} />
                  ) : (
                    <span className="text-xs text-sousou-neutral tabular-nums">
                      0
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/articles/${a.id}`}
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

function HiddenBadge() {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        "bg-muted text-sousou-neutral",
      )}
    >
      <EyeOff className="size-3" />
      Masqué
    </span>
  );
}

function ReportBadge({ count }: { count: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        "bg-sousou-tertiary/10 text-sousou-tertiary",
      )}
    >
      <Flag className="size-3" />
      {count}
    </span>
  );
}
