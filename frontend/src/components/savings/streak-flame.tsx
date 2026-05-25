"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

export function StreakFlame({
  streak,
  size = "md",
  className,
}: {
  streak: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tier = streak >= 30 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;
  const dim =
    size === "sm" ? "size-9" : size === "lg" ? "size-14" : "size-12";
  const iconDim =
    size === "sm" ? "size-4.5" : size === "lg" ? "size-7" : "size-6";

  // Couleur selon palier (dark-aware : fonds plus saturés en dark, texte clair)
  const wrapStyles = [
    "bg-sousou-neutral/15 text-sousou-neutral",
    "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300",
    "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300",
    "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300",
  ];

  return (
    <motion.div
      className={cn(
        "rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
        dim,
        wrapStyles[tier],
        className,
      )}
      animate={
        streak > 0
          ? {
              scale: [1, 1.04, 1],
              rotate: [0, -2, 2, 0],
            }
          : { scale: 1 }
      }
      transition={{
        duration: 2,
        repeat: streak > 0 ? Infinity : 0,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    >
      <Flame className={cn(iconDim, streak > 0 && "fill-current")} />
    </motion.div>
  );
}
