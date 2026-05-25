import { FileText, Flag, MessageSquare, User } from "lucide-react";
import Link from "next/link";

import { formatDateRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminOverviewStats } from "@/types/admin";

const REASON_LABELS: Record<
  AdminOverviewStats["recentReports"][number]["reason"],
  string
> = {
  SPAM: "Spam",
  INAPPROPRIATE: "Inapproprié",
  MISINFORMATION: "Désinformation",
  HARASSMENT: "Harcèlement",
  OTHER: "Autre",
};

const TARGET_ICON = {
  ARTICLE: FileText,
  USER: User,
  COMMENT: MessageSquare,
} as const;

export function RecentReportsCard({
  reports,
}: {
  reports: AdminOverviewStats["recentReports"];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg text-sousou-secondary inline-flex items-center gap-2">
          <Flag className="size-4 text-sousou-tertiary" />
          Derniers signalements
        </h2>
        <Link
          href="/admin/reports"
          className="text-xs font-semibold text-sousou-primary-700 hover:underline"
        >
          Tout voir
        </Link>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-sousou-neutral text-center py-6">
          Aucun signalement. ✨
        </p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => {
            const Icon = TARGET_ICON[r.targetType];
            const isPending = r.status === "PENDING";
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/reports/${r.id}`}
                  className="flex items-start gap-3 px-2 py-2 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center size-8 rounded-lg shrink-0",
                      isPending
                        ? "bg-sousou-tertiary/10 text-sousou-tertiary"
                        : "bg-muted text-sousou-neutral",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-sousou-secondary truncate">
                      {REASON_LABELS[r.reason]} · {r.targetType.toLowerCase()}
                    </p>
                    <p className="text-xs text-sousou-neutral mt-0.5">
                      {r.reporter?.name ?? "Anonyme"} ·{" "}
                      {formatDateRelative(r.createdAt)}
                    </p>
                  </div>
                  {isPending && (
                    <span className="text-[9px] uppercase tracking-wide bg-sousou-tertiary text-white rounded px-1.5 py-0.5 shrink-0 mt-1">
                      Nouveau
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
