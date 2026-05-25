"use client";

import { Flag } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractApiErrorMessage } from "@/lib/api";
import { createReport } from "@/lib/reports-api";
import { cn } from "@/lib/utils";
import type { ReportReason, ReportTarget } from "@/types/reports";

const REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: "SPAM", label: "Spam", hint: "Promotion non sollicitée, lien malveillant" },
  {
    value: "INAPPROPRIATE",
    label: "Contenu inapproprié",
    hint: "Vulgaire, choquant, hors sujet",
  },
  {
    value: "MISINFORMATION",
    label: "Désinformation",
    hint: "Conseil financier dangereux ou mensonger",
  },
  {
    value: "HARASSMENT",
    label: "Harcèlement",
    hint: "Insulte, attaque ciblée, discrimination",
  },
  { value: "OTHER", label: "Autre", hint: "Autre raison — précise dans la note" },
];

export function ReportContentDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  /** Titre/extrait du contenu signalé pour rappel à l'utilisateur. */
  contentLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  targetType: ReportTarget;
  targetId: string;
  contentLabel?: string;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason(null);
      setDescription("");
      setError(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reason) {
      setError("Choisis une raison.");
      return;
    }
    setSubmitting(true);
    try {
      await createReport({
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
      });
      toast.success("Signalement envoyé", {
        description:
          "Notre équipe va examiner ce contenu. Merci pour ta vigilance.",
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Signalement impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="size-5 text-sousou-tertiary" />
            Signaler ce contenu
          </DialogTitle>
          <DialogDescription>
            {contentLabel ? (
              <>
                Tu signales : <strong>{contentLabel}</strong>.
              </>
            ) : (
              "Aide-nous à garder Sou'Sou bienveillant."
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-4">
            <fieldset>
              <legend className="text-sm font-medium text-sousou-secondary mb-2">
                Pour quelle raison ?
              </legend>
              <div className="space-y-2">
                {REASONS.map((r) => {
                  const selected = reason === r.value;
                  return (
                    <label
                      key={r.value}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                        selected
                          ? "border-sousou-primary bg-sousou-primary-50"
                          : "border-border bg-card hover:bg-muted/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={selected}
                        onChange={() => setReason(r.value)}
                        className="mt-0.5 accent-sousou-primary"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-sousou-secondary">
                          {r.label}
                        </span>
                        <span className="block text-xs text-sousou-neutral mt-0.5">
                          {r.hint}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <FieldError message={error ?? undefined} />
            </fieldset>

            <div>
              <Label htmlFor="report-description">
                Précision (optionnel)
              </Label>
              <Textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Détails utiles pour l'équipe de modération..."
                className="mt-1.5"
              />
              <p className="text-xs text-sousou-neutral mt-1.5">
                {description.length} / 500
              </p>
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
            <Button type="submit" disabled={submitting || !reason}>
              {submitting ? "Envoi..." : "Envoyer le signalement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
