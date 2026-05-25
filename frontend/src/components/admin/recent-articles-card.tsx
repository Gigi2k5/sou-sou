import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { formatDateRelative } from "@/lib/format";
import type { AdminOverviewStats } from "@/types/admin";

export function RecentArticlesCard({
  articles,
}: {
  articles: AdminOverviewStats["recentArticles"];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg text-sousou-secondary">
          Derniers articles
        </h2>
        <Link
          href="/admin/articles"
          className="text-xs font-semibold text-sousou-primary-700 hover:underline"
        >
          Tout voir
        </Link>
      </div>
      {articles.length === 0 ? (
        <p className="text-sm text-sousou-neutral text-center py-6">
          Aucun article publié pour l&apos;instant.
        </p>
      ) : (
        <ul className="space-y-2">
          {articles.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 px-2 py-2 rounded-xl hover:bg-muted/40 transition-colors"
            >
              <Avatar
                avatarUrl={a.author.avatarUrl}
                name={a.author.name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/articles/${a.id}`}
                  className="text-sm font-semibold text-sousou-secondary hover:text-sousou-primary-700 line-clamp-1"
                >
                  {a.title}
                </Link>
                <p className="text-xs text-sousou-neutral mt-0.5">
                  {a.author.name} · {formatDateRelative(a.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
