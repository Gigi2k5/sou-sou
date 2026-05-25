"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { listNotifications } from "@/lib/notifications-api";
import type { AppNotification } from "@/types/notification";

const POLL_INTERVAL_MS = 60_000;

/**
 * Notif `AVATAR_UNLOCKED` non lue + ses métadonnées extraites.
 * Le `data` du backend porte `{ avatarKey, label }`.
 */
export interface PendingAvatarUnlock {
  notif: AppNotification;
  avatarKey: string;
  label: string;
}

function toUnlock(notif: AppNotification): PendingAvatarUnlock | null {
  if (notif.type !== "AVATAR_UNLOCKED") return null;
  const key = notif.data?.avatarKey;
  const label = notif.data?.label;
  if (typeof key !== "string" || typeof label !== "string") return null;
  return { notif, avatarKey: key, label };
}

/**
 * Récupère les notifs `AVATAR_UNLOCKED` non lues + une méthode pour
 * en retirer une de la queue locale (typiquement après que la modale
 * de célébration a été affichée + dismiss).
 *
 * Polling discret toutes les 60 s (mêmes contraintes que la cloche
 * notifs : on ne re-fetch que si l'onglet est visible).
 */
export function useAvatarUnlocks() {
  const [pending, setPending] = useState<PendingAvatarUnlock[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      // On filtre par `unreadOnly` côté backend pour éviter de tout charger ;
      // on filtre ensuite par type côté front (le backend ne supporte pas
      // de filtre par type — pas un goulot d'étranglement à ce volume).
      const page = await listNotifications({ unreadOnly: true, limit: 30 });
      const unlocks = page.items
        .map(toUnlock)
        .filter((u): u is PendingAvatarUnlock => u !== null);
      setPending(unlocks);
    } catch {
      /* silencieux : offline / déconnecté */
    }
  }, []);

  useEffect(() => {
    void refresh();
    function tick() {
      if (document.visibilityState === "visible") void refresh();
    }
    pollRef.current = setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  /** Retire localement une notif de la queue (après dismiss/usage). */
  const dismiss = useCallback((notifId: string) => {
    setPending((prev) => prev.filter((u) => u.notif.id !== notifId));
  }, []);

  return { pending, dismiss, refresh };
}
