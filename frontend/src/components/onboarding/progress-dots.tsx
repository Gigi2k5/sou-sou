"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export function ProgressDots({
  total,
  current,
  className,
}: {
  total: number;
  current: number;
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total - 1}
      aria-valuenow={current}
      aria-label={`Étape ${current + 1} sur ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current;
        const passed = i < current;
        return (
          <motion.span
            key={i}
            animate={{ width: active ? 24 : 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={cn(
              "h-2 rounded-full",
              active
                ? "bg-sousou-primary"
                : passed
                  ? "bg-sousou-primary/40"
                  : "bg-sousou-neutral/20",
            )}
          />
        );
      })}
    </div>
  );
}
