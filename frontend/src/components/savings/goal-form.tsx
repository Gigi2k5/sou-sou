"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
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
import { extractApiErrorMessage } from "@/lib/api";
import { formatMoney, toInputDate } from "@/lib/format";
import { createGoal, updateGoal } from "@/lib/savings-api";
import type { SavingsGoal } from "@/types/savings";

/**
 * Parse une string de montant formatée avec espaces ("100 000") ou brute
 * ("100000") vers un nombre. Retourne `NaN` si la string ne contient aucun
 * chiffre — laissé au zod pour rejeter.
 */
function parseAmount(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 0) return NaN;
  return Number(digits);
}

/** Formate un nombre en séparateur d'espaces `100 000`. */
function formatAmount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

// On garde les amounts en strings côté form pour permettre le formatting
// live "100 000". Le parse en number se fait au submit.
const schema = z
  .object({
    name: z.string().min(2, "2 caractères min").max(60),
    targetAmount: z
      .string()
      .min(1, "Montant cible requis")
      .refine((s) => {
        const n = parseAmount(s);
        return Number.isFinite(n) && n > 0;
      }, "Montant cible requis"),
    dailyAmount: z
      .string()
      .min(1, "Montant quotidien requis")
      .refine((s) => {
        const n = parseAmount(s);
        return Number.isFinite(n) && n > 0;
      }, "Montant quotidien requis"),
    deadline: z
      .string()
      .min(1, "Date d'échéance requise")
      .refine((s) => {
        const d = new Date(`${s}T23:59:59`);
        return d.getTime() > Date.now();
      }, "La date doit être dans le futur"),
  })
  .refine((d) => parseAmount(d.dailyAmount) <= parseAmount(d.targetAmount), {
    path: ["dailyAmount"],
    message: "Le montant quotidien ne peut pas dépasser l'objectif total",
  });

type FormValues = z.infer<typeof schema>;

export function GoalFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: SavingsGoal | null;
  onSaved: (goal: SavingsGoal) => void;
}) {
  const isEdit = !!initial;
  // Default: échéance à J+30 (30 jours = un mois type pour se lancer).
  const defaultDeadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toInputDate(d);
  }, []);
  // `min` sur l'input date : demain (empêche la sélection d'aujourd'hui/passé).
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toInputDate(d);
  }, []);
  const currency = "FCFA"; // Sou'Sou est mono-devise pour l'objectif d'épargne.

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      targetAmount: "",
      dailyAmount: "",
      deadline: defaultDeadline,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      reset({
        name: initial.name,
        targetAmount: formatAmount(initial.targetAmount),
        dailyAmount: formatAmount(initial.dailyAmount),
        deadline: toInputDate(new Date(initial.deadline)),
      });
    } else {
      reset({
        name: "",
        targetAmount: "",
        dailyAmount: "",
        deadline: defaultDeadline,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, reset]);

  // Reformate à la volée : chaque frappe repasse par parseAmount puis
  // formatAmount, ce qui insère les espaces de milliers pendant la saisie.
  function handleAmountChange(
    field: "targetAmount" | "dailyAmount",
    raw: string,
  ) {
    const n = parseAmount(raw);
    if (!Number.isFinite(n)) {
      setValue(field, "", { shouldValidate: false });
      return;
    }
    setValue(field, formatAmount(n), { shouldValidate: false });
  }

  const targetRaw = watch("targetAmount");
  const dailyRaw = watch("dailyAmount");
  const deadlineRaw = watch("deadline");

  // Prévisualisation live : "Sou'Sou t'aidera à mettre 100 000 FCFA d'ici le 15/07/2026".
  const preview = useMemo(() => {
    const target = parseAmount(targetRaw || "");
    const daily = parseAmount(dailyRaw || "");
    if (!Number.isFinite(target) || !Number.isFinite(daily) || target <= 0 || daily <= 0) {
      return null;
    }
    const days = Math.ceil(target / daily);
    return {
      target: formatMoney(target, currency),
      daily: formatMoney(daily, currency),
      days,
    };
  }, [targetRaw, dailyRaw]);

  async function onSubmit(values: FormValues) {
    const target = Number(values.targetAmount);
    const daily = Number(values.dailyAmount);
    const deadline = new Date(`${values.deadline}T23:59:59`);
    try {
      const goal = isEdit
        ? await updateGoal({
            name: values.name,
            targetAmount: target,
            dailyAmount: daily,
            deadline,
          })
        : await createGoal({
            name: values.name,
            targetAmount: target,
            dailyAmount: daily,
            deadline,
          });
      toast.success(isEdit ? "Objectif mis à jour" : "Objectif créé !");
      onSaved(goal);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier mon objectif" : "Mon objectif d'épargne"}
          </DialogTitle>
          <DialogDescription>
            Choisis un montant à atteindre, une échéance, et combien tu peux
            mettre de côté chaque jour.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody className="space-y-5">
            <div>
              <Label htmlFor="goal-name">Nom de l&apos;objectif</Label>
              <Input
                id="goal-name"
                type="text"
                autoFocus
                placeholder="Voyage à Marrakech, achat ordi..."
                className="mt-1.5"
                {...register("name")}
              />
              <p className="mt-1 text-xs text-sousou-neutral">
                Un petit nom pour t&apos;y retrouver.
              </p>
              <FieldError message={errors.name?.message} />
            </div>

            <div>
              <Label htmlFor="targetAmount">Combien tu veux atteindre ?</Label>
              <div className="relative mt-1.5">
                <Input
                  id="targetAmount"
                  type="text"
                  inputMode="numeric"
                  placeholder="100 000"
                  className="tabular-nums pr-14 text-lg"
                  {...register("targetAmount", {
                    onChange: (e) =>
                      handleAmountChange("targetAmount", e.target.value),
                  })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-sousou-neutral pointer-events-none">
                  FCFA
                </span>
              </div>
              <p className="mt-1 text-xs text-sousou-neutral">
                Montant total à mettre de côté.
              </p>
              <FieldError message={errors.targetAmount?.message as string} />
            </div>

            <div>
              <Label htmlFor="dailyAmount">
                Combien tu peux mettre de côté chaque jour ?
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="dailyAmount"
                  type="text"
                  inputMode="numeric"
                  placeholder="500"
                  className="tabular-nums pr-14 text-lg"
                  {...register("dailyAmount", {
                    onChange: (e) =>
                      handleAmountChange("dailyAmount", e.target.value),
                  })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-sousou-neutral pointer-events-none">
                  FCFA
                </span>
              </div>
              <p className="mt-1 text-xs text-sousou-neutral">
                Un rythme réaliste que tu peux tenir sur la durée.
              </p>
              <FieldError message={errors.dailyAmount?.message as string} />
            </div>

            <div>
              <Label htmlFor="deadline">À atteindre avant le</Label>
              <Input
                id="deadline"
                type="date"
                min={minDate}
                className="mt-1.5"
                {...register("deadline")}
              />
              <p className="mt-1 text-xs text-sousou-neutral">
                Uniquement des dates futures.
              </p>
              <FieldError message={errors.deadline?.message as string} />
            </div>

            {/* Prévisualisation live pour aider à visualiser le rythme choisi. */}
            {preview && (
              <div className="rounded-2xl border border-sousou-primary/20 bg-sousou-primary-50/60 dark:bg-sousou-primary/10 px-4 py-3 text-sm">
                <p className="text-sousou-secondary">
                  Avec{" "}
                  <span className="font-semibold">{preview.daily}</span> par
                  jour, il te faudra{" "}
                  <span className="font-semibold tabular-nums">
                    {preview.days} jour{preview.days > 1 ? "s" : ""}
                  </span>{" "}
                  pour atteindre {preview.target}.
                </p>
                {deadlineRaw && (
                  <RhythmHint
                    days={preview.days}
                    deadlineStr={deadlineRaw}
                  />
                )}
              </div>
            )}
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
                  : "Créer mon objectif"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Petit hint qui compare le rythme calculé avec la deadline choisie. */
function RhythmHint({ days, deadlineStr }: { days: number; deadlineStr: string }) {
  const deadline = new Date(`${deadlineStr}T23:59:59`);
  const now = new Date();
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (!Number.isFinite(daysUntilDeadline) || daysUntilDeadline <= 0) return null;

  if (days <= daysUntilDeadline) {
    const buffer = daysUntilDeadline - days;
    return (
      <p className="mt-1 text-xs text-sousou-primary-700 dark:text-sousou-primary">
        ✓ Tu atteindras ton objectif {buffer > 0 ? `${buffer} jour${buffer > 1 ? "s" : ""} avant l'échéance` : "pile à l'échéance"}.
      </p>
    );
  }
  const overrun = days - daysUntilDeadline;
  return (
    <p className="mt-1 text-xs text-sousou-tertiary">
      ⚠️ À ce rythme tu dépasseras l&apos;échéance de {overrun} jour
      {overrun > 1 ? "s" : ""}. Augmente le montant quotidien ou repousse
      la date.
    </p>
  );
}
