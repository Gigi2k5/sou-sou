"use client";

import { motion, useReducedMotion } from "framer-motion";

import {
  MascotAnimated,
  type MascotMood,
  type MascotSize,
} from "@/components/mascot/mascot-animated";
import { cn } from "@/lib/utils";

export type BubbleSize = "sm" | "md" | "lg";

export interface MascotBubbleProps {
  mood: MascotMood;
  message: string;
  emoji?: string;
  /** Mascotte à gauche (default) ou à droite de la bulle. */
  position?: "left" | "right";
  size?: BubbleSize;
  /** Active les mini-réactions au clic (cf. MascotAnimated). */
  interactive?: boolean;
  /** Désactive le ConfettiBurst plein écran si mood=celebrating. */
  disableConfetti?: boolean;
  className?: string;
}

/**
 * Map (size, position) → taille de la mascotte.
 * Sur mobile (≤ sm break) on garde une taille modeste pour ne pas voler
 * la moitié de l'écran.
 */
const MASCOT_SIZE_BY_BUBBLE: Record<BubbleSize, MascotSize> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

/** Couleurs de fond + texte par mood. Les variantes `dark:` viennent en
 *  surimpression — le contraste est validé sur les deux thèmes. */
const BUBBLE_TINT: Record<
  MascotMood,
  { bg: string; text: string; ring: string }
> = {
  idle: {
    bg: "bg-card",
    text: "text-sousou-secondary",
    ring: "ring-border/60",
  },
  thinking: {
    bg: "bg-card",
    text: "text-sousou-secondary",
    ring: "ring-border/60",
  },
  sleeping: {
    bg: "bg-card",
    text: "text-sousou-secondary",
    ring: "ring-border/60",
  },
  happy: {
    bg: "bg-emerald-100 dark:bg-emerald-950/60",
    text: "text-emerald-900 dark:text-emerald-100",
    ring: "ring-emerald-200 dark:ring-emerald-900",
  },
  warning: {
    bg: "bg-rose-100 dark:bg-rose-950/60",
    text: "text-rose-900 dark:text-rose-100",
    ring: "ring-rose-200 dark:ring-rose-900",
  },
  encouraging: {
    bg: "bg-amber-100 dark:bg-amber-950/60",
    text: "text-amber-900 dark:text-amber-100",
    ring: "ring-amber-200 dark:ring-amber-900",
  },
  sad: {
    bg: "bg-slate-100 dark:bg-slate-800/60",
    text: "text-slate-700 dark:text-slate-200",
    ring: "ring-slate-200 dark:ring-slate-700",
  },
  celebrating: {
    bg: "bg-sousou-primary",
    text: "text-primary-foreground",
    ring: "ring-sousou-primary/40",
  },
  flying: {
    bg: "bg-sousou-primary",
    text: "text-primary-foreground",
    ring: "ring-sousou-primary/40",
  },
};

/** Tailles texte / padding selon la taille de la bulle. */
const BUBBLE_SIZE: Record<
  BubbleSize,
  { text: string; padding: string; gap: string; emojiText: string }
> = {
  sm: {
    text: "text-xs sm:text-sm",
    padding: "px-3 py-2",
    gap: "gap-2",
    emojiText: "text-base",
  },
  md: {
    text: "text-sm sm:text-base",
    padding: "px-4 py-2.5",
    gap: "gap-3",
    emojiText: "text-lg",
  },
  lg: {
    text: "text-base sm:text-lg",
    padding: "px-5 py-3.5",
    gap: "gap-4",
    emojiText: "text-2xl",
  },
};

export function MascotBubble({
  mood,
  message,
  emoji,
  position = "left",
  size = "md",
  interactive = false,
  disableConfetti = false,
  className,
}: MascotBubbleProps) {
  const reduceMotion = useReducedMotion();
  const tint = BUBBLE_TINT[mood];
  const sz = BUBBLE_SIZE[size];
  const mascotSize = MASCOT_SIZE_BY_BUBBLE[size];
  const isRight = position === "right";

  const mascotInitial = reduceMotion ? false : { scale: 0, rotate: -6 };
  const mascotAnimate = reduceMotion
    ? { scale: 1, rotate: 0 }
    : { scale: 1, rotate: 0 };
  const mascotTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 220, damping: 16 };

  const bubbleInitial = reduceMotion
    ? false
    : { opacity: 0, x: isRight ? 12 : -12, scale: 0.95 };
  const bubbleAnimate = reduceMotion
    ? { opacity: 1, x: 0, scale: 1 }
    : { opacity: 1, x: 0, scale: 1 };
  const bubbleTransition = reduceMotion
    ? { duration: 0 }
    : { delay: 0.3, duration: 0.35, ease: "easeOut" as const };

  return (
    <div
      className={cn(
        "flex items-center",
        sz.gap,
        isRight && "flex-row-reverse",
        className,
      )}
    >
      <motion.div
        initial={mascotInitial}
        animate={mascotAnimate}
        transition={mascotTransition}
        className="shrink-0"
        style={{ originX: 0.5, originY: 1 }}
      >
        <MascotAnimated
          mood={mood}
          size={mascotSize}
          interactive={interactive}
          disableConfetti={disableConfetti}
        />
      </motion.div>

      <motion.div
        initial={bubbleInitial}
        animate={bubbleAnimate}
        transition={bubbleTransition}
        className={cn(
          "relative min-w-0 max-w-prose rounded-3xl ring-1 shadow-sm",
          tint.bg,
          tint.ring,
          sz.padding,
        )}
      >
        {/* Queue de la bulle — pointe vers la mascotte. */}
        <BubbleTail position={isRight ? "right" : "left"} bgClass={tint.bg} />

        <p className={cn("relative leading-snug", sz.text, tint.text)}>
          {emoji && (
            <span className={cn("mr-1.5 align-middle", sz.emojiText)} aria-hidden="true">
              {emoji}
            </span>
          )}
          <span className="align-middle">{message}</span>
        </p>
      </motion.div>
    </div>
  );
}

/**
 * Petit triangle "queue" pointant vers la mascotte. Utilise un ::after
 * façon CSS via un span avec border-trick, mais plus simple et plus solide :
 * un carré rotaté de 45° clippé par overflow-hidden. Hérite du `bgClass`
 * pour rester en synchro avec la couleur de la bulle.
 */
function BubbleTail({
  position,
  bgClass,
}: {
  position: "left" | "right";
  bgClass: string;
}) {
  const isLeft = position === "left";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-1/2 -translate-y-1/2 size-3 rotate-45",
        bgClass,
        // Sur la bulle "left" (mascotte à gauche) : queue côté GAUCHE de la bulle.
        isLeft ? "-left-1" : "-right-1",
      )}
    />
  );
}
