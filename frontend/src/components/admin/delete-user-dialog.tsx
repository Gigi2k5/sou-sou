"use client";

import { AlertTriangle } from "lucide-react";
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
import { deleteAdminUser } from "@/lib/admin-users-api";

export function DeleteUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
  onDeleted: () => void;
}) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConfirmEmail("");
      setError(null);
    }
  }, [open]);

  const matches = confirmEmail.trim().toLowerCase() === userEmail.toLowerCase();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!matches) {
      setError("L'email ne correspond pas.");
      return;
    }
    setSubmitting(true);
    try {
      await deleteAdminUser(userId, confirmEmail.trim());
      toast.success(`Compte de ${userName} supprimé`);
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sousou-tertiary">
            <AlertTriangle className="size-5" />
            Supprimer le compte de {userName}
          </DialogTitle>
          <DialogDescription>
            Cette action est <strong>irréversible</strong>. Les données privées
            (transactions, épargne, pots solo) sont supprimées. Les articles
            publiés et les contributions à des pots groupe sont conservés mais
            anonymisés.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-3">
            <div className="rounded-2xl bg-sousou-tertiary/10 border border-sousou-tertiary/30 px-4 py-3 text-sm">
              <p className="text-sousou-secondary">
                Pour confirmer, saisis l&apos;email exact :
              </p>
              <p className="font-mono text-sousou-tertiary mt-1 select-all">
                {userEmail}
              </p>
            </div>
            <div>
              <Label htmlFor="confirm-email">Email de confirmation</Label>
              <Input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={userEmail}
                aria-invalid={!!error || undefined}
                autoFocus
                className="mt-1.5"
              />
              <FieldError message={error ?? undefined} />
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
            <Button
              type="submit"
              variant="destructive"
              disabled={submitting || !matches}
            >
              {submitting ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
