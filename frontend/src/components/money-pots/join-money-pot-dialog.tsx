"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { joinMoneyPot } from "@/lib/money-pots-api";

const CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

export function JoinMoneyPotDialog({
  open,
  onOpenChange,
  onJoined,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onJoined: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleClose(o: boolean) {
    onOpenChange(o);
    if (!o) {
      setTimeout(() => {
        setCode("");
        setError(null);
      }, 200);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleaned = code.trim().toUpperCase();
    if (!CODE_REGEX.test(cleaned)) {
      setError("Code invalide — 6 caractères, sans I / O / 0 / 1.");
      return;
    }
    setSubmitting(true);
    try {
      const pot = await joinMoneyPot(cleaned);
      toast.success(`Bienvenue dans « ${pot.name} » !`);
      onJoined();
      handleClose(false);
      router.push(`/cotisations/${pot.id}`);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Impossible de rejoindre"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Rejoindre une cotisation</DialogTitle>
            <DialogDescription>
              Demande son code à un membre — 6 caractères, sans I / O / 0 / 1.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Label htmlFor="mp-code">Code d&apos;invitation</Label>
            <Input
              id="mp-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().slice(0, 6));
                if (error) setError(null);
              }}
              placeholder="A2B3C4"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              className="mt-1.5 h-14 text-center font-mono text-2xl font-bold tracking-[0.4em] uppercase"
              aria-invalid={!!error || undefined}
            />
            <FieldError message={error ?? undefined} />
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
            <Button type="submit" disabled={submitting || code.length < 6}>
              {submitting ? "Vérification..." : "Rejoindre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
