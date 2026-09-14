"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CommentForm } from "@/components/content/comment-form";
import { CommentItem } from "@/components/content/comment-item";
import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { listComments } from "@/lib/content-api";
import type { ArticleComment } from "@/types/content";
import type { AuthUser } from "@/lib/auth-schemas";

const PAGE_SIZE = 20;

interface CommentListProps {
  articleId: string;
  initialCount: number;
  currentUser: AuthUser | null;
  /** Notifie le parent du nouveau total (pour synchroniser commentCount affiché ailleurs). */
  onCountChange?: (count: number) => void;
}

export function CommentList({
  articleId,
  initialCount,
  currentUser,
  onCountChange,
}: CommentListProps) {
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Le parent re-crée souvent `onCountChange` à chaque render (closure inline).
  // On le ref-ise pour ne pas créer de boucle dans le useEffect ci-dessous.
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  });

  /**
   * Prévenir le parent du nouveau total est un EFFET DE BORD : il doit se
   * produire APRÈS le rendu, jamais pendant.
   *
   * ⚠️ Boucle infinie corrigée ici. `handleCreated` / `handleDeleted`
   * appelaient `onCountChange` À L'INTÉRIEUR de l'updater passé à `setTotal`.
   * React exécute les updaters pendant la phase de rendu et les REJOUE à
   * chaque tentative : on déclenchait donc un setState du parent en plein
   * rendu, React invalidait le rendu en cours, rejouait l'updater, qui
   * reprévenait le parent… jusqu'au garde-fou « Maximum update depth
   * exceeded » (50 updates imbriqués).
   *
   * Un updater doit rester du pur calcul. La notification vit désormais dans
   * cet effet unique, qui couvre tous les cas (fetch initial, pagination,
   * création, suppression). `notifiedRef` évite de renotifier une valeur déjà
   * transmise — montage, StrictMode, ou re-render du parent.
   */
  const notifiedRef = useRef<number | null>(initialCount);
  useEffect(() => {
    if (notifiedRef.current === total) return;
    notifiedRef.current = total;
    onCountChangeRef.current?.(total);
  }, [total]);

  // Fetch initial — re-déclenché uniquement si l'article change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listComments(articleId, { page: 1, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setComments(res.items);
        setPage(res.page);
        setPageCount(res.pageCount);
        setTotal(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(extractApiErrorMessage(err, "Chargement impossible"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await listComments(articleId, {
        page: page + 1,
        limit: PAGE_SIZE,
      });
      setComments((prev) => [...prev, ...res.items]);
      setPage(res.page);
      setPageCount(res.pageCount);
      setTotal(res.total);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Chargement impossible"));
    } finally {
      setLoadingMore(false);
    }
  }

  function handleCreated(comment: ArticleComment) {
    // On ajoute en fin de liste pour respecter l'ordre asc (chronologique).
    setComments((prev) => [...prev, comment]);
    setTotal((t) => t + 1);
  }

  function handleUpdated(updated: ArticleComment) {
    setComments((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  function handleDeleted(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }

  const hasMore = page < pageCount;
  const empty = !loading && comments.length === 0;

  return (
    <section className="mt-10 pt-8 border-t border-border/60">
      <h2 className="font-serif text-xl sm:text-2xl text-sousou-secondary inline-flex items-center gap-2 mb-5">
        <MessageCircle className="size-5 text-sousou-primary" />
        Commentaires
        <span className="text-sm font-normal text-sousou-neutral tabular-nums">
          ({total})
        </span>
      </h2>

      {/* Form en haut — UX classique forum / blog. */}
      <div className="mb-6">
        <CommentForm
          articleId={articleId}
          currentUser={
            currentUser
              ? { name: currentUser.name, avatarUrl: currentUser.avatarUrl }
              : null
          }
          onCreated={handleCreated}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : empty ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-dashed border-border/60 bg-card/40 p-6 text-center"
        >
          <div className="flex justify-center mb-3">
            <MascotAnimated mood="thinking" size="sm" disableConfetti />
          </div>
          <p className="text-sm text-sousou-neutral">
            Sois le premier à commenter !
          </p>
        </motion.div>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUser={currentUser}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadMore()}
            disabled={loadingMore}
          >
            {loadingMore ? "Chargement..." : "Charger plus"}
          </Button>
        </div>
      )}
    </section>
  );
}
