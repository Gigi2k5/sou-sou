"use client";

import { Loader2, Send, Users } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { extractApiErrorMessage } from "@/lib/api";
import {
  createBroadcast,
  previewBroadcast,
} from "@/lib/admin-broadcasts-api";
import { cn } from "@/lib/utils";
import type { BroadcastSegment } from "@/types/admin-broadcasts";

const SEGMENTS: {
  value: BroadcastSegment;
  label: string;
  hint: string;
}[] = [
  { value: "ALL", label: "Tous les utilisateurs", hint: "Hors bannis & comptes supprimés" },
  { value: "ACTIVE_7D", label: "Actifs (7 derniers jours)", hint: "Connectés récemment" },
  {
    value: "INACTIVE_30D",
    label: "Inactifs (30+ jours)",
    hint: "Pas connectés depuis 30 jours, ou jamais",
  },
  { value: "NEW_USERS_7D", label: "Nouveaux (7 derniers jours)", hint: "Inscrits récemment" },
  { value: "ADMINS", label: "Admins uniquement", hint: "Test interne" },
];

export function CreateBroadcastDialog({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSent: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<BroadcastSegment>("ALL");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Reset à l'ouverture
  useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setSegment("ALL");
      setPreviewCount(null);
      setError(null);
      setConfirming(false);
    }
  }, [open]);

  // Live preview count : recharge à chaque changement de segment.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingPreview(true);
    previewBroadcast(segment)
      .then((res) => {
        if (!cancelled) setPreviewCount(res.recipientCount);
      })
      .catch(() => {
        if (!cancelled) setPreviewCount(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [segment, open]);

  function validate(): string | null {
    const t = title.trim();
    const b = body.trim();
    if (t.length < 3) return "Titre requis (au moins 3 caractères).";
    if (t.length > 80) return "Titre trop long (max 80 caractères).";
    if (b.length < 5) return "Message requis (au moins 5 caractères).";
    if (b.length > 1000) return "Message trop long (max 1000 caractères).";
    if (!previewCount || previewCount === 0) {
      return "Aucun destinataire dans ce segment.";
    }
    return null;
  }

  function handlePreSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    setError(err);
    if (!err) setConfirming(true);
  }

  async function handleConfirmSend() {
    setSubmitting(true);
    try {
      await createBroadcast({
        title: title.trim(),
        body: body.trim(),
        segment,
      });
      toast.success(`Envoyé à ${previewCount} utilisateur${previewCount === 1 ? "" : "s"}`);
      onSent();
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Envoi impossible"));
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {confirming ? "Confirmer l'envoi" : "Nouveau broadcast"}
          </DialogTitle>
          <DialogDescription>
            {confirming
              ? `Le message sera envoyé en notification à ${previewCount} utilisateur${
                  previewCount === 1 ? "" : "s"
                }. Cette action est irréversible.`
              : "Envoie une notification globale à un segment d'utilisateurs."}
          </DialogDescription>
        </DialogHeader>

        {confirming ? (
          <>
            <DialogBody className="space-y-3">
              <div className="rounded-2xl border border-border bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-sousou-neutral font-semibold">
                  Aperçu
                </p>
                <p className="font-semibold text-sousou-secondary">{title}</p>
                <p className="text-sm text-sousou-neutral whitespace-pre-wrap">
                  {body}
                </p>
              </div>
              <p className="text-sm text-sousou-secondary inline-flex items-center gap-2">
                <Users className="size-4" />
                Segment :{" "}
                <strong>
                  {SEGMENTS.find((s) => s.value === segment)?.label}
                </strong>{" "}
                ({previewCount} destinataire
                {previewCount === 1 ? "" : "s"})
              </p>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={submitting}
              >
                Modifier
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSend}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {submitting ? "Envoi..." : "Envoyer maintenant"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handlePreSubmit} noValidate>
            <DialogBody className="space-y-4">
              <div>
                <Label htmlFor="bc-title">Titre</Label>
                <Input
                  id="bc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Nouvelle fonctionnalité disponible"
                  maxLength={80}
                  className="mt-1.5"
                  autoFocus
                />
                <p className="text-xs text-sousou-neutral mt-1">
                  {title.length} / 80
                </p>
              </div>
              <div>
                <Label htmlFor="bc-body">Message</Label>
                <Textarea
                  id="bc-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Ex : Découvre la nouvelle vue mensuelle dans ton tableau de bord."
                  className="mt-1.5"
                />
                <p className="text-xs text-sousou-neutral mt-1">
                  {body.length} / 1000
                </p>
              </div>
              <fieldset>
                <legend className="text-sm font-medium text-sousou-secondary mb-2">
                  Segment
                </legend>
                <div className="space-y-2">
                  {SEGMENTS.map((s) => {
                    const selected = segment === s.value;
                    return (
                      <label
                        key={s.value}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                          selected
                            ? "border-sousou-primary bg-sousou-primary-50"
                            : "border-border bg-card hover:bg-muted/40",
                        )}
                      >
                        <input
                          type="radio"
                          name="bc-segment"
                          value={s.value}
                          checked={selected}
                          onChange={() => setSegment(s.value)}
                          className="mt-0.5 accent-sousou-primary"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-sousou-secondary">
                            {s.label}
                          </span>
                          <span className="block text-xs text-sousou-neutral mt-0.5">
                            {s.hint}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="rounded-2xl border border-sousou-primary/30 bg-sousou-primary-50/50 p-3">
                <p className="text-sm text-sousou-secondary inline-flex items-center gap-2">
                  <Users className="size-4 text-sousou-primary" />
                  {loadingPreview ? (
                    <span className="text-sousou-neutral">
                      Calcul des destinataires...
                    </span>
                  ) : previewCount !== null ? (
                    <span>
                      <strong>{previewCount.toLocaleString("fr-FR")}</strong>{" "}
                      destinataire{previewCount === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="text-sousou-neutral">
                      Impossible de calculer
                    </span>
                  )}
                </p>
              </div>

              <FieldError message={error ?? undefined} />
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loadingPreview}>
                <Send className="size-4" />
                Continuer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
