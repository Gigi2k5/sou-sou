"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { extractApiErrorMessage } from "@/lib/api";
import { toInputDate } from "@/lib/format";
import {
  createTransaction,
  updateTransaction,
} from "@/lib/tracker-api";
import { cn } from "@/lib/utils";
import type {
  ExpenseCategory,
  IncomeSource,
  Transaction,
  TxType,
} from "@/types/tracker";

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, "Montant strictement positif requis"),
  date: z.string().min(1, "Date requise"),
  note: z.string().max(280).optional().or(z.literal("")),
  incomeSourceId: z.string().optional().or(z.literal("")),
  expenseCategoryId: z.string().optional().or(z.literal("")),
});

type FormValues = z.input<typeof schema>;

export function TransactionDialog({
  open,
  onOpenChange,
  initial,
  sources,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si fourni, on est en mode édition. Sinon création. */
  initial?: Transaction | null;
  sources: IncomeSource[];
  categories: ExpenseCategory[];
  onSaved: () => void;
}) {
  const isEdit = !!initial;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "EXPENSE",
      amount: "" as unknown as number,
      date: toInputDate(new Date()),
      note: "",
      incomeSourceId: "",
      expenseCategoryId: "",
    },
  });

  const type = watch("type") as TxType;

  // Sync defaults when opening / initial changes
  useEffect(() => {
    if (!open) return;
    if (initial) {
      reset({
        type: initial.type,
        amount: initial.amount,
        date: toInputDate(new Date(initial.date)),
        note: initial.note ?? "",
        incomeSourceId: initial.incomeSourceId ?? "",
        expenseCategoryId: initial.expenseCategoryId ?? "",
      });
    } else {
      reset({
        type: "EXPENSE",
        amount: "" as unknown as number,
        date: toInputDate(new Date()),
        note: "",
        incomeSourceId: "",
        expenseCategoryId: categories[0]?.id ?? "",
      });
    }
  }, [open, initial, categories, reset]);

  async function onSubmit(values: FormValues) {
    const numAmount = Number(values.amount);
    const date = new Date(`${values.date}T12:00:00`);
    try {
      if (isEdit && initial) {
        await updateTransaction(initial.id, {
          amount: numAmount,
          date,
          note: values.note || undefined,
          incomeSourceId:
            initial.type === "INCOME"
              ? values.incomeSourceId || undefined
              : undefined,
          expenseCategoryId:
            initial.type === "EXPENSE"
              ? values.expenseCategoryId || undefined
              : undefined,
        });
        toast.success("Transaction mise à jour");
      } else {
        await createTransaction({
          type: values.type as TxType,
          amount: numAmount,
          date,
          note: values.note || undefined,
          incomeSourceId:
            values.type === "INCOME"
              ? values.incomeSourceId || undefined
              : undefined,
          expenseCategoryId:
            values.type === "EXPENSE"
              ? values.expenseCategoryId || undefined
              : undefined,
        });
        toast.success(
          values.type === "EXPENSE" ? "Dépense ajoutée" : "Revenu ajouté",
        );
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        extractApiErrorMessage(
          err,
          isEdit ? "Mise à jour impossible" : "Création impossible",
        ),
      );
    }
  }

  const sourceOptions = sources;
  const categoryOptions = categories;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la transaction" : "Nouvelle transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mets à jour les détails de cette transaction."
              : "Ajoute un revenu ou une dépense à ton suivi."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody className="space-y-4">
            {!isEdit && (
              <div>
                <Label className="mb-2 block">Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <TypeToggle
                    label="Dépense"
                    selected={type === "EXPENSE"}
                    onClick={() => setValue("type", "EXPENSE")}
                    color="tertiary"
                  />
                  <TypeToggle
                    label="Revenu"
                    selected={type === "INCOME"}
                    onClick={() => setValue("type", "INCOME")}
                    color="primary"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="amount">Montant</Label>
                <Input
                  id="amount"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  placeholder="1000"
                  className="mt-1.5 tabular-nums"
                  aria-invalid={!!errors.amount || undefined}
                  {...register("amount")}
                />
                <FieldError message={errors.amount?.message as string} />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  className="mt-1.5"
                  aria-invalid={!!errors.date || undefined}
                  {...register("date")}
                />
                <FieldError message={errors.date?.message as string} />
              </div>
            </div>

            {(isEdit ? initial?.type === "EXPENSE" : type === "EXPENSE") && (
              <div>
                <Label>Catégorie</Label>
                <Select
                  value={watch("expenseCategoryId") ?? ""}
                  onValueChange={(v) =>
                    setValue("expenseCategoryId", String(v ?? ""))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue
                      placeholder={
                        categoryOptions.length === 0
                          ? "Crée d'abord une catégorie dans Paramètres"
                          : "Choisir une catégorie"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.kind === "SAVINGS" && (
                          <span className="text-[10px] uppercase tracking-wide text-sousou-primary-700 bg-sousou-primary-50 dark:bg-sousou-primary/15 dark:text-sousou-primary rounded px-1.5 py-0.5">
                            Épargne
                          </span>
                        )}
                        {c.kind === "POT" && (
                          <span className="text-[10px] uppercase tracking-wide text-violet-700 dark:text-violet-200 bg-violet-100 dark:bg-violet-900/40 rounded px-1.5 py-0.5">
                            Pot
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const selectedId = watch("expenseCategoryId");
                  const selected = categoryOptions.find(
                    (c) => c.id === selectedId,
                  );
                  if (!selected || selected.kind === "FREE") return null;
                  return (
                    <p className="mt-1.5 text-xs text-sousou-neutral">
                      {selected.kind === "SAVINGS"
                        ? "Cette dépense alimente ton épargne — la progression et le streak sont mis à jour automatiquement."
                        : "Cette dépense alimente le pot lié — la progression et les paliers sont notifiés automatiquement."}
                    </p>
                  );
                })()}
              </div>
            )}

            {(isEdit ? initial?.type === "INCOME" : type === "INCOME") && (
              <div>
                <Label>Source</Label>
                <Select
                  value={watch("incomeSourceId") ?? ""}
                  onValueChange={(v) =>
                    setValue("incomeSourceId", String(v ?? ""))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue
                      placeholder={
                        sourceOptions.length === 0
                          ? "Crée d'abord une source dans Paramètres"
                          : "Choisir une source"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="note">Note (optionnel)</Label>
              <Textarea
                id="note"
                rows={2}
                placeholder="Ex: courses du week-end"
                className="mt-1.5"
                {...register("note")}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Enregistrement..."
                : isEdit
                  ? "Mettre à jour"
                  : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TypeToggle({
  label,
  selected,
  onClick,
  color,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  color: "primary" | "tertiary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-12 rounded-xl border text-sm font-medium transition-all outline-none",
        "focus-visible:ring-3 focus-visible:ring-primary/30",
        selected && color === "primary" &&
          "border-sousou-primary bg-sousou-primary-50 text-sousou-primary-700",
        selected && color === "tertiary" &&
          "border-sousou-tertiary bg-sousou-tertiary/10 text-sousou-tertiary",
        !selected && "border-border text-sousou-neutral hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
