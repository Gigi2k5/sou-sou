"use client";

import { useEffect, useState } from "react";

/**
 * Cycle de clignement aléatoire :
 *   - yeux ouverts pendant 3 à 6 secondes
 *   - yeux fermés pendant 120 à 180 ms
 *
 * Renvoie `true` si l'œil est actuellement fermé. À utiliser pour
 * piloter l'opacité de `eyes-open` vs `eyes-closed`.
 */
export function useBlink({
  enabled = true,
  /** Override le min/max de la phase "ouvert" (ms). */
  openMin = 3000,
  openMax = 6000,
  /** Override le min/max de la phase "fermé" (ms). */
  closeMin = 120,
  closeMax = 180,
}: {
  enabled?: boolean;
  openMin?: number;
  openMax?: number;
  closeMin?: number;
  closeMax?: number;
} = {}): boolean {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setClosed(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;

    function scheduleClose() {
      const delay = openMin + Math.random() * (openMax - openMin);
      timer = setTimeout(() => {
        setClosed(true);
        const closeDelay = closeMin + Math.random() * (closeMax - closeMin);
        timer = setTimeout(() => {
          setClosed(false);
          scheduleClose();
        }, closeDelay);
      }, delay);
    }

    scheduleClose();
    return () => {
      clearTimeout(timer);
    };
  }, [enabled, openMin, openMax, closeMin, closeMax]);

  return closed;
}
