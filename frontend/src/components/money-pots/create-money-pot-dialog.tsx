"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FieldError } from "@/components/auth/field-error";
import { ShareMoneyPotCode } from "@/components/money-pots/share-money-pot-code";
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
import { Textarea } from "@/components/ui/textarea";
import { extractApiErrorMessage } from "@/lib/api";
import { createMoneyPot } from "@/lib/money-pots-api";
import { cn } from "@/lib/utils";
import type { MoneyPotSummary } from "@/types/money-pot";

const schema = z.object({
  name: z.string().min(3, "3 caractères minimum").max(60),
  description: z.string().max(280).optional(),
  targetAmount: z
    .number({ message: "Montant requis" })
    .min(1, "Montant requis")
    .max(1_000_000_000),
  deadline: z.string().optional(),
  isGroup: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function CreateMoneyPotDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (pot: MoneyPotSummary) => void;
}) {
  const [created, setCreated] = useState<MoneyPotSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      targetAmount: 0,
      deadline: "",
      isGroup: false,
    },
  });
  const isGroup = watch("isGroup");

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      const pot = await createMoneyPot({
        name: values.name.trim(),
        ...(values.description?.trim()
          ? { description: values.description.trim() }
          : {}),
        targetAmount: values.targetAmount,
        ...(values.deadline
          ? { deadline: new Date(values.deadline).toISOString() }
          : {}),
        isGroup: values.isGroup,
      });
      setCreated(pot);
      onCreated(pot);
      toast.success("Cotisation créée !");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Création impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(o: boolean) {
    onOpenChange(o);
    if (!o) {
      setTimeout(() => {
        setCreated(null);
        reset();
      }, 200);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!created ? (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DialogHeader>
              <DialogTitle>Créer une cotisation</DialogTitle>
              <DialogDescription>
                Solo ou en groupe — le toggle décide.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div>
                <Label htmlFor="mp-name">Nom</Label>
                <Input
                  id="mp-name"
                  placeholder="Cadeau anniv Aïcha"
                  className="mt-1.5"
                  maxLength={60}
                  aria-invalid={!!errors.name || undefined}
                  {...register("name")}
                />
                <FieldError message={errors.name?.message} />
              </div>
              <div>
                <Label htmlFor="mp-desc">Description (optionnel)</Label>
                <Textarea
                  id="mp-desc"
                  placeholder="Pour son cadeau commun le 15 mai"
                  rows={2}
                  className="mt-1.5"
                  maxLength={280}
                  {...register("description")}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="mp-target">Objectif</Label>
                  <Input
                    id="mp-target"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    placeholder="50000"
                    className="mt-1.5"
                    aria-invalid={!!errors.targetAmount || undefined}
                    {...register("targetAmount", { valueAsNumber: true })}
                  />
                  <FieldError message={errors.targetAmount?.message} />
                </div>
                <div>
                  <Label htmlFor="mp-deadline">Date limite (optionnel)</Label>
                  <Input
                    id="mp-deadline"
                    type="date"
                    className="mt-1.5"
                    {...register("deadline")}
                  />
                </div>
              </div>
              <fieldset className="rounded-2xl border border-border/60 p-3">
                <legend className="px-1 text-xs font-semibold text-sousou-neutral">
                  Type de cotisation
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <ToggleCard
                    active={!isGroup}
                    title="Solo"
                    description="Juste pour toi"
                    onClick={() => setValue("isGroup", false)}
                  />
                  <ToggleCard
                    active={isGroup}
                    title="Groupe"
                    description="Avec code d'invitation"
                    onClick={() => setValue("isGroup", true)}
                  />
                </div>
              </fieldset>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cotisation créée !</DialogTitle>
              <DialogDescription>
                {created.isGroup
                  ? "Partage le code à tes amis."
                  : "C'est parti — tu peux commencer à cotiser."}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {created.isGroup && created.inviteCode ? (
                <ShareMoneyPotCode
                  code={created.inviteCode}
                  potName={created.name}
                />
              ) : (
                <p className="text-sm text-sousou-neutral text-center py-4">
                  Tu peux maintenant cotiser depuis la page de la cotisation.
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>OK</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ToggleCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl px-3 py-2.5 text-left transition-all border",
        active
          ? "border-sousou-primary bg-sousou-primary-50"
          : "border-border/60 bg-card hover:border-sousou-primary/40",
      )}
    >
      <div className="font-semibold text-sm text-sousou-secondary">{title}</div>
      <div className="text-xs text-sousou-neutral">{description}</div>
    </button>
  );
}
