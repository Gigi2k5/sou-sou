"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { DeleteConfirmDialog } from "@/components/tracker/delete-confirm-dialog";
import {
  buildRange,
  RangeTabs,
  type RangeKey,
} from "@/components/tracker/range-tabs";
import { RecurringTransactionsSection } from "@/components/tracker/recurring-transactions-section";
import { TransactionDialog } from "@/components/tracker/transaction-dialog";
import { TransactionItem } from "@/components/tracker/transaction-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { extractApiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  deleteTransaction,
  listExpenseCategories,
  listIncomeSources,
  listTransactions,
} from "@/lib/tracker-api";
import { useAuth } from "@/providers/auth-provider";
import type {
  ExpenseCategory,
  IncomeSource,
  Transaction,
  TransactionsList,
  TxType,
} from "@/types/tracker";

type TypeFilter = "ALL" | TxType;

export default function TransactionsPage() {
  const { user } = useAuth();

  const [rangeKey, setRangeKey] = useState<RangeKey>("month");
  const range = useMemo(() => buildRange(rangeKey), [rangeKey]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [page, setPage] = useState(1);

  const [list, setList] = useState<TransactionsList | null>(null);
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [data, src, cats] = await Promise.all([
        listTransactions({
          type: typeFilter === "ALL" ? undefined : typeFilter,
          from: range.from,
          to: range.to,
          page,
          limit: 20,
        }),
        sources.length === 0 ? listIncomeSources() : Promise.resolve(sources),
        categories.length === 0
          ? listExpenseCategories()
          : Promise.resolve(categories),
      ]);
      setList(data);
      if (sources.length === 0) setSources(src as IncomeSource[]);
      if (categories.length === 0) setCategories(cats as ExpenseCategory[]);
    } finally {
      setLoading(false);
    }
    // we intentionally exclude sources/categories arrays from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, range.from, range.to, page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, rangeKey]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id);
      toast.success("Transaction supprimée");
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
    } finally {
      setDeleting(false);
    }
  }

  const currency = user?.currency ?? "FCFA";

  // Group items by date for nicer display
  const groups = useMemo(() => {
    if (!list?.items) return [] as { key: string; items: Transaction[] }[];
    const map = new Map<string, Transaction[]>();
    for (const tx of list.items) {
      const key = new Date(tx.date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [list]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary">
            Transactions
          </h1>
          <p className="text-sm text-sousou-neutral">
            Toutes tes entrées et sorties d&apos;argent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-between">
          <Tabs
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(String(v) as TypeFilter)}
          >
            <TabsList>
              <TabsTab value="ALL">Tout</TabsTab>
              <TabsTab value="INCOME">Revenus</TabsTab>
              <TabsTab value="EXPENSE">Dépenses</TabsTab>
            </TabsList>
          </Tabs>
          <RangeTabs value={rangeKey} onChange={setRangeKey} />
        </div>
      </header>

      <RecurringTransactionsSection
        sources={sources}
        categories={categories}
        currency={currency}
        onChange={refresh}
      />

      <div className="rounded-3xl bg-card border border-border/60 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : !list || list.items.length === 0 ? (
          <EmptyList onCreate={() => setDialogOpen(true)} />
        ) : (
          <>
            <ul>
              <AnimatePresence initial={false}>
                {groups.map((group) => (
                  <motion.li
                    key={group.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-sousou-neutral">
                      {formatDate(group.key, { weekday: "long" })}
                    </div>
                    <ul className="px-2 pb-2">
                      {group.items.map((tx, i) => (
                        <motion.li
                          key={tx.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.02 * i, duration: 0.2 }}
                        >
                          <TransactionItem
                            tx={tx}
                            currency={currency}
                            onEdit={() => {
                              setEditTarget(tx);
                              setDialogOpen(true);
                            }}
                            onDelete={() => setDeleteTarget(tx)}
                          />
                        </motion.li>
                      ))}
                    </ul>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {/* Pagination */}
            {list.pageCount > 1 && (
              <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-sm">
                <span className="text-sousou-neutral">
                  Page {list.page} sur {list.pageCount} · {list.total} transaction
                  {list.total > 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={list.page <= 1}
                  >
                    <ChevronLeft className="size-4" />
                    Préc.
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(list.pageCount, p + 1))
                    }
                    disabled={list.page >= list.pageCount}
                  >
                    Suiv.
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Button
        onClick={() => {
          setEditTarget(null);
          setDialogOpen(true);
        }}
        size="lg"
        className="fixed bottom-20 right-5 lg:bottom-8 lg:right-8 z-20 h-14 px-5 rounded-full shadow-2xl shadow-sousou-primary/40"
      >
        <Plus className="size-5" />
        <span className="hidden sm:inline">Ajouter</span>
      </Button>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditTarget(null);
        }}
        initial={editTarget}
        sources={sources}
        categories={categories}
        onSaved={refresh}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer cette transaction ?"
        description="Cette action est irréversible."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

function EmptyList({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <MascotAnimated
        mood="thinking"
        size="md"
        interactive
        disableConfetti
        className="mb-4"
      />
      <h3 className="font-serif text-xl text-sousou-secondary mb-1">
        Aucune transaction sur cette période
      </h3>
      <p className="text-sm text-sousou-neutral max-w-sm mb-5">
        Commence par enregistrer ton premier revenu ou ta première dépense.
      </p>
      <Button onClick={onCreate}>
        <Plus className="size-4" />
        Ajouter une transaction
      </Button>
    </div>
  );
}
