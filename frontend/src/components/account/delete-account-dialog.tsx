"use client";

import { Loader2, TriangleAlert } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { extractApiErrorMessage } from "@/lib/api";
import { deleteAccount } from "@/lib/account-api";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé une fois le compte réellement supprimé. */
  onDeleted: () => void;
}

/**
 * Confirmation de suppression du compte.
 *
 * Deux garde-fous, et chacun sert à autre chose. Recopier « SUPPRIMER » force à
 * sortir du pilote automatique : personne ne tape un mot en majuscules par
 * réflexe. Le mot de passe, lui, protège d'un tiers — un téléphone resté
 * déverrouillé sur la table ne doit pas suffire à effacer des mois de comptes.
 *
 * L'écran énumère aussi ce qui sera détruit, et ce qui ne le sera pas. Cacher la
 * seconde partie serait mentir par omission au moment précis où la confiance
 * compte le plus.
 */
export function DeleteAccountDialog({
  open,
  onOpenChange,
  onDeleted,
}: DeleteAccountDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const armed = confirm.trim().toUpperCase() === "SUPPRIMER" && password !== "";

  const reset = () => {
    setPassword("");
    setConfirm("");
  };

  const submit = async () => {
    setBusy(true);
    try {
      await deleteAccount(password);
      onDeleted();
    } catch (err) {
      toast.error(
        extractApiErrorMessage(err, "Suppression impossible."),
        { duration: 9000 },
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-rose-600" />
            Supprimer mon compte
          </DialogTitle>
          <DialogDescription>
            C&apos;est définitif. Il n&apos;y a pas de corbeille, pas de
            récupération.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-sm dark:border-rose-800/60 dark:bg-rose-950/25">
            <p className="mb-1 font-semibold text-rose-900 dark:text-rose-200">
              Seront effacés
            </p>
            <p className="text-rose-800/90 dark:text-rose-200/80">
              Toutes tes transactions et leurs notes, tes catégories, tes
              budgets, ton objectif d&apos;épargne, tes cotisations, tes
              dépenses récurrentes, l&apos;historique de tes imports, tes badges
              et tes points.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm">
            <p className="mb-1 font-semibold text-sousou-secondary">
              Ne seront pas effacés
            </p>
            <p className="text-sousou-neutral">
              Tes articles et commentaires publiés restent en ligne, mais
              signés « Compte supprimé » — les supprimer casserait les
              discussions auxquelles d&apos;autres ont participé. Si tu
              participes à une cotisation de groupe, ta part y reste pour ne pas
              fausser la cagnotte des autres.
            </p>
          </div>

          <p className="text-sm text-sousou-neutral">
            Pense à{" "}
            <strong className="text-sousou-secondary">
              télécharger tes données
            </strong>{" "}
            avant, si tu veux en garder une copie.
          </p>

          <div className="space-y-2">
            <label
              htmlFor="delete-confirm"
              className="block text-sm font-medium text-sousou-secondary"
            >
              Écris <span className="font-mono font-bold">SUPPRIMER</span> pour
              confirmer
            </label>
            <Input
              id="delete-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="delete-password"
              className="block text-sm font-medium text-sousou-secondary"
            >
              Ton mot de passe
            </label>
            <PasswordInput
              id="delete-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-11"
            />
          </div>
        </DialogBody>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:flex-1"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 w-full sm:flex-1"
            disabled={!armed || busy}
            onClick={() => void submit()}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Suppression…
              </>
            ) : (
              "Supprimer définitivement"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
