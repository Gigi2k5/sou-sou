"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { ConfettiBurst } from "@/components/savings/confetti-burst";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, extractApiErrorMessage } from "@/lib/api";
import { markNotificationAsRead } from "@/lib/notifications-api";
import type { AuthUser } from "@/lib/auth-schemas";
import type { PendingAvatarUnlock } from "@/hooks/use-avatar-unlocks";

/**
 * Modale célébration plein écran. Affichée quand un avatar vient d'être
 * débloqué (notif `AVATAR_UNLOCKED` non lue).
 *
 * Actions :
 * - "Utiliser" → PATCH avatar avec ce preset, mark notif read, dismiss
 * - "Plus tard" → mark notif read, dismiss
 */
export function AvatarUnlockCelebration({
  open,
  unlock,
  onClose,
  onUserUpdate,
}: {
  open: boolean;
  unlock: PendingAvatarUnlock | null;
  onClose: (notifId: string) => void;
  onUserUpdate: (user: AuthUser) => void;
}) {
  const [submitting, setSubmitting] = useState<"use" | "later" | null>(null);
  // Trigger reset au mount d'un nouvel unlock pour relancer les confettis.
  const trigger = unlock?.notif.id ? hashToInt(unlock.notif.id) : 0;

  if (!unlock) return null;

  async function handleUse() {
    if (!unlock) return;
    setSubmitting("use");
    try {
      const { data } = await api.patch<{ user: AuthUser }>(
        "/users/me/avatar",
        { type: "preset", value: unlock.avatarKey },
      );
      onUserUpdate(data.user);
      toast.success(`Avatar "${unlock.label}" sélectionné !`);
      await markNotificationAsRead(unlock.notif.id);
      onClose(unlock.notif.id);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Sélection impossible"));
    } finally {
      setSubmitting(null);
    }
  }

  async function handleLater() {
    if (!unlock) return;
    setSubmitting("later");
    try {
      await markNotificationAsRead(unlock.notif.id);
      onClose(unlock.notif.id);
    } catch {
      // Même en cas d'échec on dismiss côté UI — refresh ré-injectera si besoin.
      onClose(unlock.notif.id);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      {open && <ConfettiBurst trigger={trigger} />}
      <Dialog open={open} onOpenChange={(o) => !o && handleLater()}>
        <DialogContent
          className="sm:max-w-md p-0 overflow-hidden"
          showCloseButton={false}
        >
          <div className="px-6 pt-10 pb-6 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 18,
                delay: 0.05,
              }}
              className="relative mb-2"
            >
              {/* Halo glow derrière l'avatar */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-full bg-sousou-primary/30 blur-2xl scale-110"
              />
              <Image
                src={`/avatars/avatar-${unlock.avatarKey}.png`}
                alt={unlock.label}
                width={192}
                height={192}
                className="size-40 sm:size-48 rounded-full ring-4 ring-sousou-primary/40 shadow-2xl"
                priority
              />
            </motion.div>

            <motion.div
              initial={{ y: 0 }}
              animate={{ y: [-4, 0, -4] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute top-3 right-4 text-3xl select-none"
              aria-hidden="true"
            >
              {/* Mini "fete" texte mascotte qui saute */}
              ✨
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-sousou-primary mt-3">
                Nouvel avatar débloqué !
              </p>
              <DialogTitle className="font-serif text-3xl sm:text-4xl text-sousou-secondary mt-1">
                {unlock.label}
              </DialogTitle>
              <DialogDescription className="text-sousou-neutral mt-2 max-w-xs">
                {unlock.notif.body}
              </DialogDescription>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col-reverse sm:flex-row gap-2 w-full mt-7"
            >
              <Button
                type="button"
                variant="outline"
                className="sm:flex-1"
                onClick={handleLater}
                disabled={!!submitting}
              >
                Plus tard
              </Button>
              <Button
                type="button"
                className="sm:flex-1"
                onClick={handleUse}
                disabled={!!submitting}
              >
                {submitting === "use"
                  ? "Sélection..."
                  : "Utiliser cet avatar"}
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Hash léger pour transformer un id (uuid) en integer trigger pour les confettis. */
function hashToInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}
