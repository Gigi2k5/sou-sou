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
import { formatMoney } from "@/lib/format";
import { createTransaction } from "@/lib/tracker-api";
import type { SavingsGoal } from "@/types/savings";

export function ContributeDialog({
  open,
  onOpenChange,
  goal,
  currency,
  onContributed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  goal: SavingsGoal;
  currency: string;
  onContributed: (paidAmount: number) => void;
}) {
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(String(goal.dailyAmount));
      setError(null);
    }
  }, [open, goal.dailyAmount]);

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const numAmount = Number(amount);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError("Montant strictement positif requis");
      return;
    }
    if (!goal.categoryId) {
      setError("Catégorie d'épargne introuvable — réessaye dans un instant.");
      return;
    }
    setSubmitting(true);
    try {
      await createTransaction({
        type: "EXPENSE",
        amount: numAmount,
        date: new Date(),
        expenseCategoryId: goal.categoryId,
      });
      onContributed(numAmount);
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Contribution impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  function applyPreset(value: number) {
    setAmount(String(value));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Je contribue aujourd&apos;hui</DialogTitle>
          <DialogDescription>
            Encore {formatMoney(remaining, currency)} avant d&apos;atteindre
            ton objectif. Une dépense sera créée dans tes transactions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="amount">Montant</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 text-2xl font-serif tabular-nums h-14 text-center"
                aria-invalid={!!error || undefined}
                autoFocus
              />
              <FieldError message={error ?? undefined} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Preset
                label="Quotidien"
                value={goal.dailyAmount}
                onClick={() => applyPreset(goal.dailyAmount)}
              />
              <Preset
                label="Double"
                value={goal.dailyAmount * 2}
                onClick={() => applyPreset(goal.dailyAmount * 2)}
              />
              {remaining > 0 && remaining !== goal.dailyAmount && (
                <Preset
                  label="Reste"
                  value={remaining}
                  onClick={() => applyPreset(remaining)}
                />
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Contribution..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Preset({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-sousou-neutral hover:bg-muted hover:text-sousou-secondary transition-colors"
    >
      {label}
      <span className="ml-1.5 tabular-nums text-sousou-secondary">
        {value.toLocaleString("fr-FR")}
      </span>
    </button>
  );
}
