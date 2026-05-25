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
import { extractApiErrorMessage } from "@/lib/api";
import { toInputDate } from "@/lib/format";
import { createGoal, updateGoal } from "@/lib/savings-api";
import type { SavingsGoal } from "@/types/savings";

const schema = z
  .object({
    name: z.string().min(2, "2 caractères min").max(60),
    targetAmount: z
      .union([z.string(), z.number()])
      .transform((v) => Number(v))
      .refine((v) => Number.isFinite(v) && v > 0, "Montant cible requis"),
    dailyAmount: z
      .union([z.string(), z.number()])
      .transform((v) => Number(v))
      .refine((v) => Number.isFinite(v) && v > 0, "Montant quotidien requis"),
    deadline: z.string().min(1, "Date butoir requise"),
  })
  .refine((d) => Number(d.dailyAmount) <= Number(d.targetAmount), {
    path: ["dailyAmount"],
    message: "Le quotidien ne peut pas dépasser l'objectif",
  });

type FormValues = z.input<typeof schema>;

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

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 30);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      targetAmount: "" as unknown as number,
      dailyAmount: "" as unknown as number,
      deadline: toInputDate(tomorrow),
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      reset({
        name: initial.name,
        targetAmount: initial.targetAmount,
        dailyAmount: initial.dailyAmount,
        deadline: toInputDate(new Date(initial.deadline)),
      });
    } else {
      reset({
        name: "",
        targetAmount: "" as unknown as number,
        dailyAmount: "" as unknown as number,
        deadline: toInputDate(tomorrow),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, reset]);

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
            Définis combien tu veux mettre de côté, en combien de temps, et
            combien par jour.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="goal-name">Nom de l&apos;objectif</Label>
              <Input
                id="goal-name"
                type="text"
                placeholder="Voyage à Marrakech, achat ordi..."
                className="mt-1.5"
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="targetAmount">Montant cible</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="500000"
                  className="mt-1.5 tabular-nums"
                  {...register("targetAmount")}
                />
                <FieldError message={errors.targetAmount?.message as string} />
              </div>
              <div>
                <Label htmlFor="dailyAmount">Par jour</Label>
                <Input
                  id="dailyAmount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="5000"
                  className="mt-1.5 tabular-nums"
                  {...register("dailyAmount")}
                />
                <FieldError message={errors.dailyAmount?.message as string} />
              </div>
            </div>

            <div>
              <Label htmlFor="deadline">Date butoir</Label>
              <Input
                id="deadline"
                type="date"
                className="mt-1.5"
                {...register("deadline")}
              />
              <FieldError message={errors.deadline?.message as string} />
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
