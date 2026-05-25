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

interface Config {
  title: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  successMessage: string;
  errorFallback: string;
  confirmLabel: string;
  loadingLabel: string;
  destructive?: boolean;
  minLength: number;
  maxLength: number;
}

export function ArticleActionDialog({
  open,
  onOpenChange,
  config,
  onConfirm,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  config: Config;
  onConfirm: (value: string) => Promise<void>;
  onSuccess?: () => void;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = value.trim();
    if (trimmed.length < config.minLength) {
      setError(`Au moins ${config.minLength} caractères requis.`);
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
      toast.success(config.successMessage);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, config.errorFallback));
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
              <Label htmlFor="article-action-field">{config.fieldLabel}</Label>
              <Textarea
                id="article-action-field"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={4}
                maxLength={config.maxLength}
                placeholder={config.placeholder}
                aria-invalid={!!error || undefined}
                autoFocus
                className="mt-1.5"
              />
              <FieldError message={error ?? undefined} />
              <p className="text-xs text-sousou-neutral mt-1.5">
                {value.length} / {config.maxLength}
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
