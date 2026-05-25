"use client";

import { motion } from "framer-motion";
import { Plus, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BudgetCard } from "@/components/budgets/budget-card";
import { BudgetFormDialog } from "@/components/budgets/budget-form-dialog";
import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { DeleteConfirmDialog } from "@/components/tracker/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { deleteBudget, listBudgets } from "@/lib/budgets-api";
import { listExpenseCategories } from "@/lib/tracker-api";
import { useAuth } from "@/providers/auth-provider";
import type { Budget } from "@/types/budget";
import type { ExpenseCategory } from "@/types/tracker";

export default function BudgetsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "FCFA";

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [bs, cats] = await Promise.all([
        listBudgets(),
        listExpenseCategories(),
      ]);
      setBudgets(bs);
      setCategories(cats);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Chargement impossible"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Catégories FREE de l'user qui n'ont pas encore de budget.
  const availableCategories = useMemo(() => {
    const usedIds = new Set(budgets.map((b) => b.category.id));
    return categories.filter((c) => c.kind === "FREE" && !usedIds.has(c.id));
  }, [budgets, categories]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBudget(deleteTarget.id);
      toast.success("Budget supprimé");
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary inline-flex items-center gap-2">
            <Wallet className="size-7 text-sousou-primary" />
            Mes budgets
          </h1>
          <p className="text-sm text-sousou-neutral mt-1">
            Un plafond mensuel par catégorie pour garder le contrôle 💸
          </p>
        </div>
        {budgets.length > 0 && (
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="self-start sm:self-auto"
          >
            <Plus className="size-4" />
            Définir un budget
          </Button>
        )}
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
            hidden: {},
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
        >
          {budgets.map((b, i) => (
            <BudgetCard
              key={b.id}
              budget={b}
              currency={currency}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
              delay={0.05 * i}
            />
          ))}
        </motion.div>
      )}

      <BudgetFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        availableCategories={availableCategories}
        currency={currency}
        onSuccess={refresh}
      />

      {editTarget && (
        <BudgetFormDialog
          mode="edit"
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          budget={editTarget}
          currency={currency}
          onSuccess={refresh}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Supprimer le budget « ${deleteTarget?.category.name ?? ""} » ?`}
        description="Tes transactions ne sont pas affectées. Tu pourras recréer un budget à tout moment."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/60 bg-card p-8 sm:p-12 text-center">
      <div className="flex justify-center mb-4">
        <MascotAnimated mood="thinking" size="md" disableConfetti />
      </div>
      <h2 className="font-serif text-xl text-sousou-secondary mb-2">
        Pas encore de budget
      </h2>
      <p className="text-sm text-sousou-neutral max-w-md mx-auto mb-6">
        Définis un plafond par catégorie pour mieux contrôler tes dépenses.
        Sou&apos;Sou t&apos;avertira quand tu approches de la limite.
      </p>
      <Button type="button" onClick={onCreate}>
        <Plus className="size-4" />
        Définir mon premier budget
      </Button>
    </div>
  );
}
