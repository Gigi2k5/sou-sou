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
import { resolveAdminReport } from "@/lib/admin-reports-api";
import type { ReportStatus } from "@/types/reports";

interface Config {
  status: ReportStatus;
  title: string;
  description: string;
  successMessage: string;
  confirmLabel: string;
  loadingLabel: string;
  destructive?: boolean;
  noteRequired?: boolean;
}

export function ResolveReportDialog({
  open,
  onOpenChange,
  reportId,
  config,
  onResolved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reportId: string;
  config: Config;
  onResolved: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNote("");
      setError(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = note.trim();
    if (config.noteRequired && trimmed.length < 3) {
      setError("Note requise (au moins 3 caractères).");
      return;
    }
    setSubmitting(true);
    try {
      await resolveAdminReport(reportId, {
        status: config.status,
        adminNote: trimmed || undefined,
      });
      toast.success(config.successMessage);
      onResolved();
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Action impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="report-note">
                Note interne {config.noteRequired ? "" : "(optionnel)"}
              </Label>
              <Textarea
                id="report-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Trace pour les autres admins."
                aria-invalid={!!error || undefined}
                autoFocus
                className="mt-1.5"
              />
              <FieldError message={error ?? undefined} />
              <p className="text-xs text-sousou-neutral mt-1.5">
                {note.length} / 500
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
            <Button
              type="submit"
              variant={config.destructive ? "destructive" : "default"}
              disabled={submitting}
            >
              {submitting ? config.loadingLabel : config.confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
