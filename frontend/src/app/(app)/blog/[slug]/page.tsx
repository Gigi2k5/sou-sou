"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Flag, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CommentList } from "@/components/content/comment-list";
import { LikeButton } from "@/components/content/like-button";
import { MarkdownView } from "@/components/content/markdown-view";
import { ReportContentDialog } from "@/components/content/report-content-dialog";
import { DeleteConfirmDialog } from "@/components/tracker/delete-confirm-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { deleteArticle, getArticle } from "@/lib/content-api";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import type { Article } from "@/types/content";

export default function ArticleDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const router = useRouter();
  const { user } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    void (async () => {
      try {
        const a = await getArticle(slug);
        setArticle(a);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const canEdit =
    !!user &&
    !!article &&
    (user.role === "ADMIN" || user.id === article.author.id);
  const canReport = !!user && !!article && user.id !== article.author.id;

  async function handleDelete() {
    if (!article) return;
    setDeleting(true);
    try {
      await deleteArticle(article.id);
      toast.success("Article supprimé");
      router.push("/blog");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="text-center py-16">
        <h1 className="font-serif text-3xl text-sousou-secondary mb-2">
          Article introuvable
        </h1>
        <p className="text-sousou-neutral mb-5">
          Cet article n&apos;existe pas ou a été supprimé.
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/blog">
              <ArrowLeft className="size-4" />
              Retour au blog
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-sousou-neutral hover:text-sousou-secondary mb-6"
      >
        <ArrowLeft className="size-4" />
        Tous les articles
      </Link>

      {article.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImage}
          alt=""
          className="w-full aspect-[16/9] object-cover rounded-3xl mb-6"
        />
      )}

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-sousou-secondary leading-tight mb-4">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-sousou-neutral mb-6">
          <span className="inline-flex items-center gap-2">
            <Avatar
              avatarUrl={article.author.avatarUrl}
              name={article.author.name}
              size="sm"
            />
            <span className="font-medium text-sousou-secondary">
              {article.author.name}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-4" />
            {formatDate(article.createdAt)}
          </span>
          <div className="ml-auto flex gap-1">
            {canEdit && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/blog/${article.slug}/edit`}
                      aria-label="Modifier"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteOpen(true)}
                  aria-label="Supprimer"
                  className="hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
            {canReport && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setReportOpen(true)}
                aria-label="Signaler"
                className="hover:text-sousou-tertiary"
              >
                <Flag className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <MarkdownView content={article.content} />
      </motion.div>

      {/* Like button — caché pour l'auteur (il ne peut pas se liker lui-même). */}
      <div className="mt-8 flex items-center justify-start">
        <LikeButton
          articleId={article.id}
          initialLiked={article.likedByMe}
          initialCount={article.likeCount}
          disabled={!user || user.id === article.author.id}
          disabledReason={
            user?.id === article.author.id
              ? "Tu ne peux pas liker ton propre article."
              : undefined
          }
          onChange={(s) =>
            setArticle((prev) =>
              prev
                ? { ...prev, likedByMe: s.liked, likeCount: s.likeCount }
                : prev,
            )
          }
        />
      </div>

      {/* Section commentaires */}
      <CommentList
        articleId={article.id}
        initialCount={article.commentCount}
        currentUser={user}
        onCountChange={(count) =>
          setArticle((prev) => (prev ? { ...prev, commentCount: count } : prev))
        }
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer cet article ?"
        description="L'article sera définitivement supprimé. Cette action est irréversible."
        onConfirm={handleDelete}
        loading={deleting}
      />
      <ReportContentDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="ARTICLE"
        targetId={article.id}
        contentLabel={article.title}
      />
    </article>
  );
}
