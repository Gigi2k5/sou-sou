"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { MascotAnimated, type MascotMood } from "@/components/mascot/mascot-animated";

const ROTATION_MS = 6000;

/** Choisit un mood "thématique" pour faire matcher l'animation au contenu de la phrase. */
function moodForInsight(text: string): MascotMood {
  if (text.includes("⚠️")) return "warning";
  if (text.includes("💪") || text.includes("🎉")) return "celebrating";
  if (text.includes("📈") || text.includes("💰")) return "happy";
  if (text.includes("📅") || text.includes("🔍")) return "thinking";
  return "encouraging";
}

export function MascotBubble({ insights }: { insights: string[] }) {
  const items = useMemo(() => insights.filter((i) => i.trim().length > 0), [insights]);
  // Clé d'identité : on remet l'index à 0 quand le tableau d'inputs change
  // (changement de période). Pattern "ajuster l'état pendant le rendu" préconisé
  // par la doc React, plus propre qu'un useEffect qui setState.
  const [trackedItems, setTrackedItems] = useState(items);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (trackedItems !== items) {
    setTrackedItems(items);
    setIndex(0);
  }

  useEffect(() => {
    if (paused || items.length <= 1) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused, items.length]);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <MascotAnimated mood="thinking" size="md" disableConfetti />
          <p className="text-sm text-sousou-neutral">
            Pas encore assez de données pour générer des analyses sur cette
            période. Ajoute quelques transactions et reviens 👀
          </p>
        </div>
      </div>
    );
  }

  const current = items[index];
  const mood = moodForInsight(current);

  return (
    <div
      className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-6">
        <div className="shrink-0">
          <MascotAnimated mood={mood} size="md" interactive disableConfetti />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center w-full">
          <div className="relative min-h-[80px] sm:min-h-[64px]">
            <AnimatePresence mode="wait">
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-base sm:text-lg leading-relaxed text-sousou-secondary"
              >
                {current}
              </motion.p>
            </AnimatePresence>
          </div>

          {items.length > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {items.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Insight ${i + 1}`}
                    className={`size-2 rounded-full transition-colors ${
                      i === index
                        ? "bg-sousou-primary w-5"
                        : "bg-sousou-neutral/30 hover:bg-sousou-neutral/50"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setIndex((i) => (i - 1 + items.length) % items.length)
                  }
                  aria-label="Insight précédent"
                  className="p-1.5 rounded-full text-sousou-neutral hover:bg-muted hover:text-sousou-secondary transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i + 1) % items.length)}
                  aria-label="Insight suivant"
                  className="p-1.5 rounded-full text-sousou-neutral hover:bg-muted hover:text-sousou-secondary transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
