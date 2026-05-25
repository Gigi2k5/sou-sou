"use client";

import { motion } from "framer-motion";
import { ChevronRight, FileText, MessageSquare, User } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { formatDateRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminReportListItem } from "@/types/admin-reports";
import type { ReportReason, ReportStatus, ReportTarget } from "@/types/reports";

const REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Spam",
  INAPPROPRIATE: "Inapproprié",
  MISINFORMATION: "Désinformation",
  HARASSMENT: "Harcèlement",
  OTHER: "Autre",
};

const TARGET_ICON: Record<ReportTarget, typeof FileText> = {
  ARTICLE: FileText,
  USER: User,
  COMMENT: MessageSquare,
};

const TARGET_LABEL: Record<ReportTarget, string> = {
  ARTICLE: "Article",
  USER: "Utilisateur",
  COMMENT: "Commentaire",
};

export function AdminReportsList({
  reports,
}: {
  reports: AdminReportListItem[];
}) {
  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-sousou-neutral">
          Aucun signalement dans cette catégorie. ✨
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {reports.map((r, i) => {
        const TargetIcon = TARGET_ICON[r.targetType];
        return (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 * i, duration: 0.2 }}
          >
            <Link
              href={`/admin/reports/${r.id}`}
              className={cn(
                "flex items-start gap-3 rounded-2xl border bg-card p-3 hover:bg-muted/40 transition-colors",
                r.status === "PENDING"
                  ? "border-sousou-tertiary/40"
                  : "border-border/60",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-xl size-10 shrink-0",
                  r.status === "PENDING"
                    ? "bg-sousou-tertiary/10 text-sousou-tertiary"
                    : "bg-muted text-sousou-neutral",
                )}
              >
                <TargetIcon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs uppercase tracking-wide text-sousou-neutral font-semibold">
                    {TARGET_LABEL[r.targetType]}
                  </span>
                  <span className="text-xs text-sousou-neutral">·</span>
                  <span className="text-sm font-semibold text-sousou-secondary">
                    {REASON_LABELS[r.reason]}
                  </span>
                  <StatusPill status={r.status} />
                </div>
                {r.description && (
                  <p className="text-xs text-sousou-neutral italic line-clamp-2 mt-0.5">
                    « {r.description} »
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-sousou-neutral">
                  {r.reporter ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar
                        avatarUrl={r.reporter.avatarUrl}
                        name={r.reporter.name}
                        size="xs"
                      />
                      <span className="truncate">{r.reporter.name}</span>
                    </span>
                  ) : (
                    <span className="italic">Anonyme</span>
                  )}
                  <span>·</span>
                  <span>{formatDateRelative(r.createdAt)}</span>
                </div>
              </div>
              <ChevronRight className="size-4 text-sousou-neutral shrink-0 mt-2" />
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}

function StatusPill({ status }: { status: ReportStatus }) {
  const config: Record<
    ReportStatus,
    { label: string; cls: string }
  > = {
    PENDING: {
      label: "À traiter",
      cls: "bg-sousou-tertiary/10 text-sousou-tertiary",
    },
    REVIEWING: {
      label: "En cours",
      cls: "bg-sousou-primary-50 text-sousou-primary-700",
    },
    RESOLVED: {
      label: "Résolu",
      cls: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200",
    },
    REJECTED: {
      label: "Rejeté",
      cls: "bg-muted text-sousou-neutral",
    },
  };
  const c = config[status];
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        c.cls,
      )}
    >
      {c.label}
    </span>
  );
}
