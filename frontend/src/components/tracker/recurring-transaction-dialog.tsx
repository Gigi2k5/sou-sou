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
import {
  createRecurringTransaction,
  updateRecurringTransaction,
} from "@/lib/recurring-api";
import { cn } from "@/lib/utils";
import type { RecurringTransaction } from "@/types/recurring";
import type { ExpenseCategory, IncomeSource } from "@/types/tracker";

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine(
      (v) => Number.isFinite(v) && v > 0,
      "Montant strictement positif requis",
    ),
  dayOfMonth: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine(
      (v) => Number.isInteger(v) && v >= 1 && v <= 31,
      "Jour entre 1 et 31",
    ),
  note: z.string().max(140).optional().or(z.literal("")),
  incomeSourceId: z.string().optional().or(z.literal("")),
  expenseCategoryId: z.string().optional().or(z.literal("")),
});

type FormValues = z.input<typeof schema>;

export function RecurringTransactionDialog({
  open,
  onOpenChange,
  initial,
  sources,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: RecurringTransaction | null;
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
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "EXPENSE",
      amount: "",
      dayOfMonth: 1,
      note: "",
      incomeSourceId: "",
      expenseCategoryId: "",
    },
  });
  const type = watch("type");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      reset({
        type: initial.type,
        amount: String(initial.amount),
        dayOfMonth: initial.dayOfMonth,
        note: initial.note ?? "",
        incomeSourceId: initial.incomeSourceId ?? "",
        expenseCategoryId: initial.expenseCategoryId ?? "",
      });
    } else {
      reset({
        type: "EXPENSE",
        amount: "",
        dayOfMonth: 1,
        note: "",
        incomeSourceId: "",
        expenseCategoryId: "",
      });
    }
  }, [open, initial, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        type: values.type,
        amount: Number(values.amount),
        dayOfMonth: Number(values.dayOfMonth),
        note: values.note?.trim() || undefined,
        incomeSourceId:
          values.type === "INCOME" && values.incomeSourceId
            ? values.incomeSourceId
            : undefined,
        expenseCategoryId:
          values.type === "EXPENSE" && values.expenseCategoryId
            ? values.expenseCategoryId
            : undefined,
      };
      if (isEdit && initial) {
        await updateRecurringTransaction(initial.id, {
          amount: payload.amount,
          dayOfMonth: payload.dayOfMonth,
          note: payload.note ?? "",
          incomeSourceId:
            values.type === "INCOME"
              ? (payload.incomeSourceId ?? null)
              : null,
          expenseCategoryId:
            values.type === "EXPENSE"
              ? (payload.expenseCategoryId ?? null)
              : null,
        });
        toast.success("Récurrence mise à jour");
      } else {
        await createRecurringTransaction(payload);
        toast.success("Récurrence créée");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Enregistrement impossible"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la récurrence" : "Nouvelle récurrence"}
          </DialogTitle>
          <DialogDescription>
            Mensuel — la transaction sera créée chaque mois au jour choisi.
            Si le jour n&apos;existe pas (ex: 31 en février), elle est créée
            le dernier jour du mois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setValue("type", "INCOME", { shouldDirty: true })}
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm font-semibold border transition-all",
                  type === "INCOME"
                    ? "border-sousou-primary bg-sousou-primary-50 text-sousou-primary-700"
                    : "border-border/60 bg-card text-sousou-neutral hover:border-sousou-primary/40",
                )}
                disabled={isEdit}
              >
                Revenu
              </button>
              <button
                type="button"
                onClick={() =>
                  setValue("type", "EXPENSE", { shouldDirty: true })
                }
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm font-semibold border transition-all",
                  type === "EXPENSE"
                    ? "border-sousou-tertiary bg-sousou-tertiary-50 text-sousou-tertiary-700"
                    : "border-border/60 bg-card text-sousou-neutral hover:border-sousou-tertiary/40",
                )}
                disabled={isEdit}
              >
                Dépense
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rt-amount">Montant</Label>
                <Input
                  id="rt-amount"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  placeholder="1000"
                  className="mt-1.5 text-xl tabular-nums"
                  aria-invalid={!!errors.amount || undefined}
                  {...register("amount")}
                />
                <FieldError message={errors.amount?.message} />
              </div>
              <div>
                <Label htmlFor="rt-day">Jour du mois</Label>
                <Input
                  id="rt-day"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="31"
                  className="mt-1.5 text-xl tabular-nums"
                  aria-invalid={!!errors.dayOfMonth || undefined}
                  {...register("dayOfMonth")}
                />
                <FieldError message={errors.dayOfMonth?.message} />
              </div>
            </div>

            {type === "INCOME" && (
              <div>
                <Label htmlFor="rt-source">Source de revenu (optionnel)</Label>
                <Select
                  value={watch("incomeSourceId") || ""}
                  onValueChange={(v) =>
                    setValue("incomeSourceId", v ?? "", { shouldDirty: true })
                  }
                >
                  <SelectTrigger id="rt-source" className="mt-1.5">
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === "EXPENSE" && (
              <div>
                <Label htmlFor="rt-category">
                  Catégorie de dépense (optionnel)
                </Label>
                <Select
                  value={watch("expenseCategoryId") || ""}
                  onValueChange={(v) =>
                    setValue("expenseCategoryId", v ?? "", {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger id="rt-category" className="mt-1.5">
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="rt-note">Note (optionnel)</Label>
              <Textarea
                id="rt-note"
                rows={2}
                maxLength={140}
                className="mt-1.5"
                placeholder="Loyer, abonnement Netflix..."
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
              {isSubmitting ? "Enregistrement..." : isEdit ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
