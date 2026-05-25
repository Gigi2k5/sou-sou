"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { extractApiErrorMessage } from "@/lib/api";
import { likeArticle, unlikeArticle } from "@/lib/content-api";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  articleId: string;
  initialLiked: boolean;
  initialCount: number;
  /** Désactive le bouton (ex: l'auteur lui-même) avec un tooltip explicatif. */
  disabled?: boolean;
  disabledReason?: string;
  /** Callback optionnel pour synchroniser l'état parent (ArticleCard, page détail). */
  onChange?: (status: { liked: boolean; likeCount: number }) => void;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Bouton like avec animation cœur (pulse + hearts qui s'envolent quand on like).
 * Optimistic update : on bascule l'UI tout de suite, on rollback si l'API rejette.
 */
export function LikeButton({
  articleId,
  initialLiked,
  initialCount,
  disabled = false,
  disabledReason,
  onChange,
  size = "md",
  className,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const reduceMotion = useReducedMotion();

  async function toggle(e: React.MouseEvent | React.KeyboardEvent) {
    // Évite que le clic remonte au <Link> de l'ArticleCard parent.
    e.preventDefault();
    e.stopPropagation();
    if (disabled || pending) return;

    const wasLiked = liked;
    const optimisticLiked = !wasLiked;
    const optimisticCount = count + (optimisticLiked ? 1 : -1);

    setLiked(optimisticLiked);
    setCount(optimisticCount);
    setPending(true);
    if (optimisticLiked && !reduceMotion) setBurstKey((k) => k + 1);

    try {
      const res = optimisticLiked
        ? await likeArticle(articleId)
        : await unlikeArticle(articleId);
      setLiked(res.liked);
      setCount(res.likeCount);
      onChange?.({ liked: res.liked, likeCount: res.likeCount });
    } catch (err) {
      // Rollback
      setLiked(wasLiked);
      setCount(count);
      toast.error(extractApiErrorMessage(err, "Action impossible"));
    } finally {
      setPending(false);
    }
  }

  const isSmall = size === "sm";

  return (
    <button
      type="button"
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") toggle(e);
      }}
      disabled={disabled}
      aria-pressed={liked}
      aria-label={
        disabled
          ? (disabledReason ?? "Action indisponible")
          : liked
            ? "Retirer mon like"
            : "Liker l'article"
      }
      title={disabled ? disabledReason : undefined}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full transition-colors",
        "focus:outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
        isSmall ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm font-semibold",
        disabled
          ? "text-sousou-neutral/60 cursor-not-allowed"
          : liked
            ? "bg-sousou-tertiary/15 dark:bg-sousou-tertiary/25 text-sousou-tertiary hover:bg-sousou-tertiary/20"
            : "bg-muted/60 text-sousou-neutral hover:bg-muted hover:text-sousou-tertiary",
        className,
      )}
    >
      <motion.span
        key={liked ? "liked" : "not-liked"}
        initial={reduceMotion ? false : { scale: 0.6, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 18,
        }}
        className="relative inline-flex"
      >
        <Heart
          className={cn(
            isSmall ? "size-3.5" : "size-4",
            liked && "fill-current",
          )}
        />
        {/* Petits cœurs qui s'envolent quand on like. */}
        <AnimatePresence>
          {!reduceMotion && burstKey > 0 && liked && (
            <FloatingHearts key={burstKey} small={isSmall} />
          )}
        </AnimatePresence>
      </motion.span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

function FloatingHearts({ small }: { small: boolean }) {
  // 3 mini cœurs qui partent du bouton vers le haut avec dispersion.
  const hearts = [
    { x: -10, delay: 0 },
    { x: 0, delay: 0.05 },
    { x: 10, delay: 0.1 },
  ];
  return (
    <>
      {hearts.map((h, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0], y: -22, x: h.x, scale: 1 }}
          transition={{ duration: 0.7, delay: h.delay, ease: "easeOut" }}
          className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none text-sousou-tertiary"
          aria-hidden
        >
          <Heart className={cn(small ? "size-2.5" : "size-3", "fill-current")} />
        </motion.span>
      ))}
    </>
  );
}
