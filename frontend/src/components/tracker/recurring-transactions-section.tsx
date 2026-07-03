"use client";

import { motion } from "framer-motion";
import {
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { DeleteConfirmDialog } from "@/components/tracker/delete-confirm-dialog";
import { RecurringTransactionDialog } from "@/components/tracker/recurring-transaction-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import {
  deleteRecurringTransaction,
  listRecurringTransactions,
  updateRecurringTransaction,
} from "@/lib/recurring-api";
import { cn } from "@/lib/utils";
import type { RecurringTransaction } from "@/types/recurring";
import type { ExpenseCategory, IncomeSource } from "@/types/tracker";

export function RecurringTransactionsSection({
  sources,
  categories,
  currency,
  onChange,
}: {
  sources: IncomeSource[];
  categories: ExpenseCategory[];
  currency: string;
  /** Appelé quand une récurrence est créée/modifiée/supprimée — utile pour
   * rafraîchir la liste de transactions principale (la matérialisation peut
   * créer/effacer des transactions).
   */
  onChange: () => void;
}) {
  const [items, setItems] = useState<RecurringTransaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRecurringTransactions();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function togglePause(r: RecurringTransaction) {
    // Optimiste : on met à jour la liste localement avant l'aller-retour API.
    setItems((prev) =>
      prev?.map((x) =>
        x.id === r.id ? { ...x, isActive: !x.isActive } : x,
      ) ?? null,
    );
    try {
      await updateRecurringTransaction(r.id, { isActive: !r.isActive });
      toast.success(!r.isActive ? "Récurrence reprise" : "Récurrence en pause");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Action impossible"));
      void refresh();
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteSubmitting(true);
    try {
      await deleteRecurringTransaction(deleting.id);
      toast.success("Récurrence supprimée");
      setDeleting(null);
      await refresh();
      onChange();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl bg-card border border-border/60 p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-serif text-xl text-sousou-secondary inline-flex items-center gap-2">
            <Repeat className="size-5 text-sousou-primary" />
            Récurrentes
          </h3>
          <p className="text-sm text-sousou-neutral">
            Tes revenus et dépenses qui reviennent chaque mois.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Ajouter
        </Button>
      </header>

      {loading || !items ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-sousou-neutral text-center py-6">
          Aucune récurrence pour l&apos;instant. Ajoute-en une pour automatiser
          tes revenus / dépenses mensuels.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((r, i) => (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 * i }}
              className={cn(
                "rounded-2xl border border-border/60 bg-card px-4 py-3",
                !r.isActive && "opacity-60",
              )}
            >
              {/* Ligne principale : icône + label + montant */}
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "shrink-0 size-9 rounded-full inline-flex items-center justify-center",
                    r.type === "INCOME"
                      ? "bg-sousou-primary-50 text-sousou-primary-700 dark:bg-sousou-primary/15 dark:text-sousou-primary"
                      : "bg-sousou-tertiary/10 text-sousou-tertiary dark:bg-sousou-tertiary/20",
                  )}
                  aria-hidden="true"
                >
                  {r.type === "INCOME" ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-sousou-secondary truncate">
                      {r.note ||
                        (r.type === "INCOME"
                          ? r.incomeSource?.name ?? "Revenu mensuel"
                          : r.expenseCategory?.name ?? "Dépense mensuelle")}
                    </span>
                    {!r.isActive && (
                      <span className="text-[11px] font-semibold text-sousou-neutral bg-muted rounded-full px-2 py-0.5 shrink-0">
                        en pause
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-sousou-neutral mt-0.5 truncate">
                    Le{" "}
                    <strong className="text-sousou-secondary tabular-nums">
                      {r.dayOfMonth}
                    </strong>{" "}
                    du mois
                    {r.type === "INCOME" && r.incomeSource
                      ? ` · ${r.incomeSource.name}`
                      : null}
                    {r.type === "EXPENSE" && r.expenseCategory
                      ? ` · ${r.expenseCategory.name}`
                      : null}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums shrink-0",
                    r.type === "INCOME"
                      ? "text-sousou-primary"
                      : "text-sousou-tertiary",
                  )}
                >
                  {r.type === "INCOME" ? "+" : "-"}
                  {formatMoney(r.amount, currency)}
                </span>
              </div>
              {/* Ligne actions : sous le contenu sur mobile étroit — donne
                  suffisamment d'espace au label + montant. */}
              <div className="flex items-center justify-end gap-0.5 mt-1.5 -mr-1">
                <IconButton
                  ariaLabel={r.isActive ? "Mettre en pause" : "Reprendre"}
                  onClick={() => togglePause(r)}
                >
                  {r.isActive ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                </IconButton>
                <IconButton
                  ariaLabel="Modifier"
                  onClick={() => {
                    setEditing(r);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton
                  ariaLabel="Supprimer"
                  onClick={() => setDeleting(r)}
                  hover="destructive"
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <RecurringTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        sources={sources}
        categories={categories}
        onSaved={() => {
          void refresh();
          onChange();
        }}
      />
      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Supprimer cette récurrence ?"
        description="Les transactions déjà générées sont conservées. Plus aucune nouvelle transaction ne sera créée pour cette règle."
        onConfirm={handleDelete}
        loading={deleteSubmitting}
      />
    </section>
  );
}

function IconButton({
  ariaLabel,
  onClick,
  children,
  hover = "default",
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
  hover?: "default" | "destructive";
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "size-8 rounded-full inline-flex items-center justify-center text-sousou-neutral",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        hover === "destructive"
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "hover:bg-muted hover:text-sousou-secondary",
      )}
    >
      {children}
    </button>
  );
}
