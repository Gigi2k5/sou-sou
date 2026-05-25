"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Eye,
  EyeOff,
  Flag,
  MessageSquareWarning,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ArticleActionDialog } from "@/components/admin/article-action-dialog";
import { MarkdownView } from "@/components/content/markdown-view";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import {
  deleteAdminArticle,
  getAdminArticleDetail,
  hideAdminArticle,
  unhideAdminArticle,
  warnArticleAuthor,
} from "@/lib/admin-articles-api";
import { formatDate, formatDateRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AdminArticleDetail,
  AdminArticleReport,
} from "@/types/admin-articles";
import type { ReportReason } from "@/types/reports";

const REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Spam",
  INAPPROPRIATE: "Inapproprié",
  MISINFORMATION: "Désinformation",
  HARASSMENT: "Harcèlement",
  OTHER: "Autre",
};

export default function AdminArticleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [article, setArticle] = useState<AdminArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideOpen, setHideOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [unhiding, setUnhiding] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAdminArticleDetail(id);
      setArticle(data);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Article introuvable"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleUnhide() {
    if (!article) return;
    setUnhiding(true);
    try {
      await unhideAdminArticle(article.id);
      toast.success("Article rendu visible");
      await refresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Démasquage impossible"));
    } finally {
      setUnhiding(false);
    }
  }

  if (loading && !article) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-16">
        <h1 className="font-serif text-3xl text-sousou-secondary mb-2">
          Article introuvable
        </h1>
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/admin/articles">
              <ArrowLeft className="size-4" />
              Retour à la liste
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Link
        href="/admin/articles"
        className="inline-flex items-center gap-1.5 text-sm text-sousou-neutral hover:text-sousou-secondary"
      >
        <ArrowLeft className="size-4" />
        Tous les articles
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        <div className="flex items-start gap-2 flex-wrap">
          {article.isHidden && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted text-sousou-neutral px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              <EyeOff className="size-3" />
              Masqué
            </span>
          )}
          {article.reportCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sousou-tertiary/10 text-sousou-tertiary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide tabular-nums">
              <Flag className="size-3" />
              {article.reportCount} signalement{article.reportCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl text-sousou-secondary leading-tight">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-sousou-neutral">
          <Link
            href={`/admin/users/${article.author.id}`}
            className="inline-flex items-center gap-2 hover:text-sousou-secondary transition-colors"
          >
            <Avatar
              avatarUrl={article.author.avatarUrl}
              name={article.author.name}
              size="sm"
            />
            <span className="font-medium text-sousou-secondary">
              {article.author.name}
            </span>
            {article.author.isBanned && (
              <span className="text-[9px] uppercase tracking-wide bg-sousou-tertiary text-white rounded px-1.5 py-0.5">
                Banni
              </span>
            )}
          </Link>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-4" />
            {formatDate(article.createdAt)}
          </span>
        </div>

        {article.isHidden && article.hiddenReason && (
          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-sousou-neutral font-semibold mb-1">
              Raison du masquage
            </p>
            <p className="text-sm text-sousou-secondary">
              {article.hiddenReason}
            </p>
            {article.hiddenAt && (
              <p className="text-xs text-sousou-neutral mt-1">
                Masqué {formatDateRelative(article.hiddenAt)}
              </p>
            )}
          </div>
        )}
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Contenu */}
        <article className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          {article.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.coverImage}
              alt=""
              className="w-full aspect-[16/9] object-cover rounded-2xl mb-6"
            />
          )}
          <MarkdownView content={article.content} />
        </article>

        {/* Sidebar : actions + signalements */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-sousou-neutral font-semibold mb-2">
              Actions modération
            </h2>
            {article.isHidden ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleUnhide}
                disabled={unhiding}
                className="w-full justify-start"
              >
                <Eye className="size-4" />
                {unhiding ? "Démasquage..." : "Démasquer"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setHideOpen(true)}
                className="w-full justify-start"
              >
                <EyeOff className="size-4" />
                Masquer
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setWarnOpen(true)}
              className="w-full justify-start"
            >
              <MessageSquareWarning className="size-4" />
              Avertir l&apos;auteur
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Supprimer définitivement
            </Button>
          </div>

          <ReportsPanel reports={article.reports} />
        </aside>
      </div>

      <ArticleActionDialog
        open={hideOpen}
        onOpenChange={setHideOpen}
        config={{
          title: `Masquer « ${article.title} » ?`,
          description:
            "L'article sera caché du public mais l'auteur le verra toujours et recevra une notification.",
          fieldLabel: "Raison du masquage",
          placeholder: "Ex : Désinformation financière non sourcée.",
          successMessage: "Article masqué",
          errorFallback: "Masquage impossible",
          confirmLabel: "Confirmer le masquage",
          loadingLabel: "Masquage...",
          minLength: 3,
          maxLength: 280,
        }}
        onConfirm={(reason) => hideAdminArticle(article.id, reason).then(() => {})}
        onSuccess={refresh}
      />

      <ArticleActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        config={{
          title: `Supprimer « ${article.title} » ?`,
          description:
            "L'article sera définitivement supprimé. Cette action est irréversible et l'auteur sera notifié.",
          fieldLabel: "Raison de la suppression",
          placeholder: "Ex : Contenu illégal — incitation à la fraude.",
          successMessage: "Article supprimé",
          errorFallback: "Suppression impossible",
          confirmLabel: "Confirmer la suppression",
          loadingLabel: "Suppression...",
          destructive: true,
          minLength: 3,
          maxLength: 280,
        }}
        onConfirm={(reason) => deleteAdminArticle(article.id, reason)}
        onSuccess={() => router.push("/admin/articles")}
      />

      <ArticleActionDialog
        open={warnOpen}
        onOpenChange={setWarnOpen}
        config={{
          title: `Avertir ${article.author.name} ?`,
          description:
            "Une notification interne sera envoyée à l'auteur. Aucun masquage ni suppression.",
          fieldLabel: "Message d'avertissement",
          placeholder:
            "Ex : Merci de sourcer tes affirmations sur les taux d'intérêt.",
          successMessage: "Avertissement envoyé",
          errorFallback: "Envoi impossible",
          confirmLabel: "Envoyer l'avertissement",
          loadingLabel: "Envoi...",
          minLength: 5,
          maxLength: 500,
        }}
        onConfirm={(message) => warnArticleAuthor(article.id, message)}
      />
    </div>
  );
}

function ReportsPanel({ reports }: { reports: AdminArticleReport[] }) {
  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-center">
        <p className="text-xs text-sousou-neutral">
          Aucun signalement sur cet article.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-xs uppercase tracking-wide text-sousou-neutral font-semibold mb-3 flex items-center gap-1.5">
        <AlertTriangle className="size-3.5" />
        Signalements ({reports.length})
      </h2>
      <ul className="space-y-3">
        {reports.map((r) => (
          <li
            key={r.id}
            className={cn(
              "rounded-xl border border-border/60 bg-background/40 p-2.5 text-xs",
              r.status === "PENDING" && "border-sousou-tertiary/40",
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-sousou-secondary">
                {REASON_LABELS[r.reason]}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-sousou-neutral">
                {r.status}
              </span>
            </div>
            {r.description && (
              <p className="text-sousou-neutral mb-1.5 italic">
                « {r.description} »
              </p>
            )}
            <div className="flex items-center justify-between text-[11px] text-sousou-neutral">
              <span className="truncate">
                par {r.reporter?.name ?? "Anonyme"}
              </span>
              <span>{formatDateRelative(r.createdAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
