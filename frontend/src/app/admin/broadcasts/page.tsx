"use client";

import { motion } from "framer-motion";
import { Megaphone, Send, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CreateBroadcastDialog } from "@/components/admin/create-broadcast-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { listAdminBroadcasts } from "@/lib/admin-broadcasts-api";
import { formatDate, formatDateRelative } from "@/lib/format";
import type {
  BroadcastSegment,
  BroadcastsList,
} from "@/types/admin-broadcasts";

const SEGMENT_LABELS: Record<BroadcastSegment, string> = {
  ALL: "Tous",
  ACTIVE_7D: "Actifs 7j",
  INACTIVE_30D: "Inactifs 30j+",
  NEW_USERS_7D: "Nouveaux 7j",
  ADMINS: "Admins",
};

const PAGE_SIZE = 20;

export default function AdminBroadcastsPage() {
  const [data, setData] = useState<BroadcastsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAdminBroadcasts(page, PAGE_SIZE);
      setData(result);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Chargement impossible"));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-sousou-secondary">
            Notifications globales
          </h1>
          <p className="text-sm text-sousou-neutral mt-1">
            {data
              ? `${data.total.toLocaleString("fr-FR")} broadcast${data.total > 1 ? "s" : ""} envoyé${data.total > 1 ? "s" : ""}`
              : "Historique des notifications globales envoyées."}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="self-start sm:self-auto"
        >
          <Send className="size-4" />
          Nouveau broadcast
        </Button>
      </header>

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Megaphone className="size-10 text-sousou-neutral mx-auto mb-3" />
          <p className="text-sm text-sousou-neutral mb-4">
            Aucun broadcast envoyé pour l&apos;instant.
          </p>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Send className="size-4" />
            Envoyer le premier
          </Button>
        </div>
      ) : data ? (
        <>
          <ul className="space-y-2">
            {data.items.map((b, i) => (
              <motion.li
                key={b.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * i, duration: 0.2 }}
                className="rounded-2xl border border-border/60 bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center rounded-xl size-10 shrink-0 bg-sousou-primary-50 text-sousou-primary-700">
                    <Megaphone className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h3 className="font-semibold text-sousou-secondary">
                        {b.title}
                      </h3>
                      <span className="rounded-full bg-muted text-sousou-neutral px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        {SEGMENT_LABELS[b.segment]}
                      </span>
                    </div>
                    <p className="text-sm text-sousou-neutral whitespace-pre-wrap line-clamp-2 mt-1">
                      {b.body}
                    </p>
                    <div className="flex items-center gap-3 mt-2.5 text-[11px] text-sousou-neutral flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        {b.recipientCount.toLocaleString("fr-FR")} destinataire
                        {b.recipientCount === 1 ? "" : "s"}
                      </span>
                      {b.createdBy && (
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar
                            avatarUrl={b.createdBy.avatarUrl}
                            name={b.createdBy.name}
                            size="xs"
                          />
                          {b.createdBy.name}
                        </span>
                      )}
                      <span title={formatDate(b.createdAt)}>
                        · {formatDateRelative(b.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
          {data.pageCount > 1 && (
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              onPageChange={setPage}
              loading={loading}
            />
          )}
        </>
      ) : null}

      <CreateBroadcastDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSent={refresh}
      />
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onPageChange,
  loading,
}: {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1 || loading}
      >
        Précédent
      </Button>
      <span className="text-sm text-sousou-neutral tabular-nums">
        Page {page} / {pageCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount || loading}
      >
        Suivant
      </Button>
    </div>
  );
}
