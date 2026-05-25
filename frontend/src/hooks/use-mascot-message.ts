"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getMascotMessage } from "@/lib/mascot-api";
import type { MascotContext, MascotMessage } from "@/types/mascot";

interface UseMascotMessageReturn {
  message: MascotMessage | null;
  loading: boolean;
  /** Recharge le message depuis l'API. */
  refresh: () => Promise<void>;
  /**
   * Force temporairement un mood + message pendant `ttlMs` (default 4500 ms),
   * puis revient au dernier message serveur. Utilisé pour célébrer une
   * contribution réussie / un objectif complété sans attendre le rafraîchissement.
   */
  override: (msg: MascotMessage, ttlMs?: number) => void;
}

/**
 * Hook qui fetch le message contextuel de la mascotte, avec fallback silencieux
 * (si l'API plante, on retombe sur un message idle pour ne jamais casser l'UI).
 */
export function useMascotMessage(
  context: MascotContext,
): UseMascotMessageReturn {
  const [serverMessage, setServerMessage] = useState<MascotMessage | null>(null);
  const [overrideMessage, setOverrideMessage] = useState<MascotMessage | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const overrideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMascotMessage(context);
      setServerMessage(data);
    } catch {
      setServerMessage({
        mood: "idle",
        message: "Sou'Sou veille sur tes finances.",
      });
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
    };
  }, []);

  const override = useCallback((msg: MascotMessage, ttlMs = 4500) => {
    setOverrideMessage(msg);
    if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
    overrideTimerRef.current = setTimeout(() => {
      setOverrideMessage(null);
      void refresh();
    }, ttlMs);
  }, [refresh]);

  return {
    message: overrideMessage ?? serverMessage,
    loading,
    refresh,
    override,
  };
}
