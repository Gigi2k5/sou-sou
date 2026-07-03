"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anime un nombre vers `target` en `duration` ms via easeOutCubic.
 * Utilisé pour les chiffres clés du dashboard (balance, totaux).
 */
export function useCountUp(target: number, duration = 700): number {
  // Guard NaN/Infinity — sinon l'animation produit du NaN qui se propage aux
  // consumers (balance, total cotisé, etc.). Défaut à 0 dans ces cas.
  const safeTarget = Number.isFinite(target) ? target : 0;
  const [value, setValue] = useState(safeTarget);
  const fromRef = useRef(safeTarget);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (safeTarget - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = safeTarget;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [safeTarget, duration]);

  return value;
}
