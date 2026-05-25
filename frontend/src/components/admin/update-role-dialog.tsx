"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { extractApiErrorMessage } from "@/lib/api";
import { updateAdminUserRole } from "@/lib/admin-users-api";
import type { AdminUserRole } from "@/types/admin-users";

export function UpdateRoleDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentRole,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  userName: string;
  currentRole: AdminUserRole;
  onUpdated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const targetRole: AdminUserRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
  const isPromote = targetRole === "ADMIN";

  async function onConfirm() {
    setSubmitting(true);
    try {
      await updateAdminUserRole(userId, targetRole);
      toast.success(
        isPromote
          ? `${userName} est maintenant administrateur`
          : `${userName} n'est plus administrateur`,
      );
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        extractApiErrorMessage(err, "Changement de rôle impossible"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isPromote
              ? `Promouvoir ${userName} ?`
              : `Rétrograder ${userName} ?`}
          </DialogTitle>
          <DialogDescription>
            {isPromote
              ? "Cet utilisateur aura accès à tout l'espace administrateur."
              : "Cet utilisateur perdra l'accès à tout l'espace administrateur."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-sousou-secondary">
            <strong>Rôle actuel</strong> : {currentRole}
            <br />
            <strong>Rôle cible</strong> : {targetRole}
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
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            variant={isPromote ? "default" : "destructive"}
          >
            {submitting ? "..." : isPromote ? "Promouvoir" : "Rétrograder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
