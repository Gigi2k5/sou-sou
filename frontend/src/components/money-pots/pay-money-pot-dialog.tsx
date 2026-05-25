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

export function PayMoneyPotDialog({
  open,
  onOpenChange,
  categoryId,
  potName,
  remaining,
  currency,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Catégorie système POT propre au user — `MoneyPotDetail.myCategoryId`. */
  categoryId: string;
  potName: string;
  remaining: number;
  currency: string;
  onPaid: (paidAmount: number) => void;
}) {
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount("");
      setNote("");
      setError(null);
    }
  }, [open]);

  const numAmount = Number(amount);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError("Montant strictement positif requis");
      return;
    }
    setSubmitting(true);
    try {
      await createTransaction({
        type: "EXPENSE",
        amount: numAmount,
        date: new Date(),
        note: note.trim() || undefined,
        expenseCategoryId: categoryId,
      });
      onPaid(numAmount);
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Paiement impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  function applyPreset(value: number) {
    setAmount(String(Math.round(value)));
  }

  // Suggestions intelligentes basées sur le restant
  const presets = uniquePositive([
    Math.round(remaining * 0.1),
    Math.round(remaining * 0.25),
    Math.round(remaining),
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cotiser à « {potName} »</DialogTitle>
          <DialogDescription>
            Encore <strong>{formatMoney(remaining, currency)}</strong> avant
            d&apos;atteindre l&apos;objectif. Une dépense sera créée dans tes
            transactions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="mp-amount">Montant</Label>
              <Input
                id="mp-amount"
                type="number"
                inputMode="decimal"
                step="1"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 text-2xl font-serif tabular-nums h-14 text-center"
                aria-invalid={!!error || undefined}
                placeholder="0"
                autoFocus
              />
              <FieldError message={error ?? undefined} />
            </div>
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-sousou-neutral hover:bg-muted hover:text-sousou-secondary transition-colors tabular-nums"
                  >
                    {p.toLocaleString("fr-FR")}
                  </button>
                ))}
              </div>
            )}
            <div>
              <Label htmlFor="mp-note">Note (optionnel)</Label>
              <Input
                id="mp-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Part de Aïcha + Bineta"
                maxLength={140}
                className="mt-1.5"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Paiement..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function uniquePositive(values: number[]): number[] {
  return Array.from(new Set(values.filter((v) => v > 0)));
}
