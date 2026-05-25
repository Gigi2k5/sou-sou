"use client";

import { Lock } from "lucide-react";
import Image from "next/image";

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
import { cn } from "@/lib/utils";
import type { AvatarStatus } from "@/types/avatar";

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Modal affiché au clic sur un avatar verrouillé. Explique la condition
 * + montre la progression "X / Y" + un message d'encouragement.
 */
export function AvatarConditionDialog({
  open,
  onOpenChange,
  avatar,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  avatar: AvatarStatus | null;
}) {
  if (!avatar) return null;
  const progress = avatar.progress;
  const percent = progress
    ? Math.round((progress.current / progress.target) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Avatar verrouillé</DialogTitle>
          <DialogDescription>
            Continue ton parcours pour le débloquer.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col items-center text-center pt-2">
          <div className="relative mb-4">
            <Image
              src={`/avatars/avatar-${avatar.key}.png`}
              alt=""
              width={128}
              height={128}
              className="size-28 rounded-full grayscale brightness-90 blur-[1px]"
            />
            <span
              className={cn(
                "absolute inset-0 m-auto size-12 rounded-full",
                "bg-sousou-secondary/85 text-white flex items-center justify-center shadow-lg",
              )}
              aria-hidden="true"
            >
              <Lock className="size-5" />
            </span>
          </div>
          <h3 className="font-serif text-xl text-sousou-secondary">
            {avatar.label}
          </h3>
          <p className="text-sm text-sousou-neutral mt-1.5">
            {avatar.description}
          </p>

          {progress && progress.target > 1 && (
            <div className="w-full mt-5">
              <div className="flex items-center justify-between text-xs text-sousou-neutral mb-1.5">
                <span>Progression</span>
                <span className="font-semibold text-sousou-secondary">
                  {fmt.format(progress.current)} /{" "}
                  {fmt.format(progress.target)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-sousou-primary transition-all"
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-sousou-neutral mt-2">
                Plus que <strong>{fmt.format(Math.max(0, progress.target - progress.current))}</strong> pour y arriver — tu vas y arriver !
              </p>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Compris !</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
