"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ReportTargetPreview } from "@/components/admin/report-target-preview";
import { ResolveReportDialog } from "@/components/admin/resolve-report-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import {
  getAdminReportDetail,
  resolveAdminReport,
} from "@/lib/admin-reports-api";
import { formatDate, formatDateRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminReportDetail } from "@/types/admin-reports";
import type { ReportReason, ReportStatus } from "@/types/reports";

const REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Spam",
  INAPPROPRIATE: "Inapproprié",
  MISINFORMATION: "Désinformation",
  HARASSMENT: "Harcèlement",
  OTHER: "Autre",
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: "À traiter",
  REVIEWING: "En cours",
  RESOLVED: "Résolu",
  REJECTED: "Rejeté",
};

const STATUS_CLS: Record<ReportStatus, string> = {
  PENDING: "bg-sousou-tertiary/10 text-sousou-tertiary",
  REVIEWING: "bg-sousou-primary-50 text-sousou-primary-700",
  RESOLVED: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200",
  REJECTED: "bg-muted text-sousou-neutral",
};

export default function AdminReportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [report, setReport] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [movingToReviewing, setMovingToReviewing] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAdminReportDetail(id);
      setReport(data);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Signalement introuvable"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleMoveToReviewing() {
    if (!report) return;
    setMovingToReviewing(true);
    try {
      await resolveAdminReport(report.id, { status: "REVIEWING" });
      toast.success("Pris en charge");
      await refresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Action impossible"));
    } finally {
      setMovingToReviewing(false);
    }
  }

  if (loading && !report) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-16">
        <h1 className="font-serif text-3xl text-sousou-secondary mb-2">
          Signalement introuvable
        </h1>
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/admin/reports">
              <ArrowLeft className="size-4" />
              Retour à la liste
            </Link>
          }
        />
      </div>
    );
  }

  const isClosed =
    report.status === "RESOLVED" || report.status === "REJECTED";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        href="/admin/reports"
        className="inline-flex items-center gap-1.5 text-sm text-sousou-neutral hover:text-sousou-secondary"
      >
        <ArrowLeft className="size-4" />
        Tous les signalements
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
              STATUS_CLS[report.status],
            )}
          >
            {STATUS_LABELS[report.status]}
          </span>
          <span className="rounded-full bg-muted text-sousou-neutral px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
            {report.targetType}
          </span>
          <span className="rounded-full bg-muted text-sousou-neutral px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
            {REASON_LABELS[report.reason]}
          </span>
        </div>

        <h1 className="font-serif text-3xl text-sousou-secondary leading-tight">
          Signalement {REASON_LABELS[report.reason].toLowerCase()}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-sousou-neutral">
          {report.reporter ? (
            <Link
              href={`/admin/users/${report.reporter.id}`}
              className="inline-flex items-center gap-2 hover:text-sousou-secondary transition-colors"
            >
              <Avatar
                avatarUrl={report.reporter.avatarUrl}
                name={report.reporter.name}
                size="sm"
              />
              <span className="font-medium text-sousou-secondary">
                {report.reporter.name}
              </span>
            </Link>
          ) : (
            <span className="italic">Reporter anonymisé</span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-4" />
            Signalé {formatDateRelative(report.createdAt)}
          </span>
        </div>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Colonne gauche : description + cible + note admin */}
        <div className="space-y-4">
          {report.description && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-sousou-neutral font-semibold mb-2">
                Description du signaleur
              </p>
              <p className="text-sm text-sousou-secondary whitespace-pre-wrap">
                {report.description}
              </p>
            </div>
          )}

          <ReportTargetPreview target={report.target} />

          {report.adminNote && (
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-sousou-neutral font-semibold mb-2 flex items-center gap-1.5">
                <ClipboardList className="size-3.5" />
                Note de modération
              </p>
              <p className="text-sm text-sousou-secondary whitespace-pre-wrap">
                {report.adminNote}
              </p>
              {report.resolvedAt && (
                <p className="text-xs text-sousou-neutral mt-2">
                  Clos le {formatDate(report.resolvedAt)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar : actions résolution */}
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-sousou-neutral font-semibold mb-2">
              Actions
            </h2>
            {isClosed ? (
              <p className="text-xs text-sousou-neutral italic px-1">
                Ce signalement est clos. Crée-en un nouveau si nécessaire.
              </p>
            ) : (
              <>
                {report.status === "PENDING" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMoveToReviewing}
                    disabled={movingToReviewing}
                    className="w-full justify-start"
                  >
                    {movingToReviewing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ClipboardList className="size-4" />
                    )}
                    Prendre en charge
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResolveOpen(true)}
                  className="w-full justify-start text-emerald-700 hover:text-emerald-700"
                >
                  <CheckCircle2 className="size-4" />
                  Marquer résolu
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                  className="w-full justify-start"
                >
                  <XCircle className="size-4" />
                  Rejeter (non fondé)
                </Button>
              </>
            )}
          </div>

          {report.target?.type === "ARTICLE" && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-3 text-xs text-sousou-neutral">
              💡 Si l&apos;article doit être masqué ou supprimé, utilise les
              actions sur la page de l&apos;article (ouvrable depuis le bloc
              ci-contre).
            </div>
          )}
        </aside>
      </div>

      <ResolveReportDialog
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        reportId={report.id}
        config={{
          status: "RESOLVED",
          title: "Marquer comme résolu",
          description:
            "Le signalement sera clos. Indique en note l'action prise (ex : article masqué, user averti).",
          successMessage: "Signalement résolu",
          confirmLabel: "Marquer résolu",
          loadingLabel: "Validation...",
          noteRequired: true,
        }}
        onResolved={refresh}
      />

      <ResolveReportDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        reportId={report.id}
        config={{
          status: "REJECTED",
          title: "Rejeter ce signalement",
          description:
            "Marque le signalement comme non fondé. La cible n'est pas affectée.",
          successMessage: "Signalement rejeté",
          confirmLabel: "Rejeter",
          loadingLabel: "Rejet...",
          destructive: true,
        }}
        onResolved={refresh}
      />
    </div>
  );
}
