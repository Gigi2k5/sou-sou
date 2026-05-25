"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api";
import {
  createBudget,
  updateBudget,
} from "@/lib/budgets-api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Budget } from "@/types/budget";
import type { ExpenseCategory } from "@/types/tracker";

/**
 * Modale unifiée création / édition d'un budget.
 *
 *  - mode="create" : on liste les catégories FREE disponibles (sans budget existant)
 *    et l'user choisit + saisit limit + threshold.
 *  - mode="edit"   : la catégorie est verrouillée, on édite limit + threshold + isActive.
 */

interface CreateProps {
  mode: "create";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Catégories FREE de l'user qui n'ont pas encore de budget. */
  availableCategories: ExpenseCategory[];
  currency: string;
  onSuccess: () => void;
}

interface EditProps {
  mode: "edit";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  budget: Budget;
  currency: string;
  onSuccess: () => void;
}

export function BudgetFormDialog(props: CreateProps | EditProps) {
  const isEdit = props.mode === "edit";
  const initialCategoryId =
    props.mode === "edit"
      ? props.budget.category.id
      : (props.availableCategories[0]?.id ?? "");

  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [monthlyLimit, setMonthlyLimit] = useState(
    props.mode === "edit" ? String(Math.round(props.budget.monthlyLimit)) : "",
  );
  const [thresholdPct, setThresholdPct] = useState(
    props.mode === "edit"
      ? Math.round(props.budget.alertThreshold * 100)
      : 80,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset à l'ouverture
  useEffect(() => {
    if (!props.open) return;
    if (props.mode === "edit") {
      setCategoryId(props.budget.category.id);
      setMonthlyLimit(String(Math.round(props.budget.monthlyLimit)));
      setThresholdPct(Math.round(props.budget.alertThreshold * 100));
    } else {
      setCategoryId(props.availableCategories[0]?.id ?? "");
      setMonthlyLimit("");
      setThresholdPct(80);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  const limitNum = Number(monthlyLimit);
  const thresholdAmount =
    !Number.isNaN(limitNum) && limitNum > 0
      ? Math.round(limitNum * (thresholdPct / 100))
      : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId) {
      setError("Choisis une catégorie.");
      return;
    }
    if (!Number.isFinite(limitNum) || limitNum <= 0) {
      setError("Saisis un montant positif.");
      return;
    }
    if (thresholdPct < 50 || thresholdPct > 95) {
      setError("Le seuil doit être entre 50 % et 95 %.");
      return;
    }

    setSubmitting(true);
    try {
      if (props.mode === "create") {
        await createBudget({
          categoryId,
          monthlyLimit: limitNum,
          alertThreshold: thresholdPct / 100,
        });
        toast.success("Budget créé");
      } else {
        await updateBudget(props.budget.id, {
          monthlyLimit: limitNum,
          alertThreshold: thresholdPct / 100,
        });
        toast.success("Budget mis à jour");
      }
      props.onSuccess();
      props.onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Action impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  const noCategoriesAvailable =
    props.mode === "create" && props.availableCategories.length === 0;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le budget" : "Définir un budget"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste la limite mensuelle ou le seuil d'alerte."
              : "Fixe un plafond mensuel pour mieux contrôler tes dépenses."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-4">
            {/* Sélecteur catégorie */}
            <div>
              <Label htmlFor="bdg-category">Catégorie</Label>
              {isEdit ? (
                <p className="mt-1.5 px-3 py-2 rounded-xl bg-muted text-sm text-sousou-secondary">
                  {props.budget.category.name}
                </p>
              ) : noCategoriesAvailable ? (
                <p className="mt-1.5 px-3 py-2 rounded-xl bg-muted text-sm text-sousou-neutral">
                  Toutes tes catégories ont déjà un budget — ou tu n&apos;as pas
                  encore créé de catégorie de dépense libre.
                </p>
              ) : (
                <select
                  id="bdg-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={cn(
                    "mt-1.5 w-full px-3 py-2 rounded-xl border bg-background text-sm",
                    "border-input focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                >
                  {props.availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Montant */}
            <div>
              <Label htmlFor="bdg-limit">Limite mensuelle</Label>
              <div className="relative mt-1.5">
                <Input
                  id="bdg-limit"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  placeholder="50000"
                  className="pr-16"
                  disabled={noCategoriesAvailable}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-sousou-neutral">
                  {props.currency}
                </span>
              </div>
            </div>

            {/* Seuil d'alerte */}
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="bdg-threshold">Seuil d&apos;alerte</Label>
                <span className="text-xs font-semibold tabular-nums text-sousou-secondary">
                  {thresholdPct} %
                </span>
              </div>
              <input
                id="bdg-threshold"
                type="range"
                min={50}
                max={95}
                step={5}
                value={thresholdPct}
                onChange={(e) => setThresholdPct(Number(e.target.value))}
                className="mt-2 w-full accent-sousou-primary"
                disabled={noCategoriesAvailable}
              />
              <p className="text-xs text-sousou-neutral mt-1.5">
                {limitNum > 0
                  ? `Tu seras alerté à partir de ${formatMoney(
                      thresholdAmount,
                      props.currency,
                    )}.`
                  : "Saisis une limite pour voir le montant d'alerte."}
              </p>
            </div>

            <FieldError message={error ?? undefined} />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || noCategoriesAvailable}
            >
              {submitting
                ? "Validation..."
                : isEdit
                  ? "Enregistrer"
                  : "Créer le budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
