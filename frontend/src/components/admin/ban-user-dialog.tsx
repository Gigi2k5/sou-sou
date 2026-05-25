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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractApiErrorMessage } from "@/lib/api";
import { banAdminUser } from "@/lib/admin-users-api";

export function BanUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onBanned,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  userName: string;
  onBanned: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Raison requise (au moins 3 caractères).");
      return;
    }
    setSubmitting(true);
    try {
      await banAdminUser(userId, trimmed);
      toast.success(`${userName} a été banni`);
      onBanned();
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Bannissement impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bannir {userName} ?</DialogTitle>
          <DialogDescription>
            Le user sera immédiatement déconnecté et ne pourra plus se
            reconnecter. Cette action est journalisée.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="ban-reason">Raison du bannissement</Label>
              <Textarea
                id="ban-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={280}
                placeholder="Ex : Contenu inapproprié récurrent malgré avertissements."
                aria-invalid={!!error || undefined}
                autoFocus
                className="mt-1.5"
              />
              <FieldError message={error ?? undefined} />
              <p className="text-xs text-sousou-neutral mt-1.5">
                {reason.length} / 280
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
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Bannissement..." : "Confirmer le bannissement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
