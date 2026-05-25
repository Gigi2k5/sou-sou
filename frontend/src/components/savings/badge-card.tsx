"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

import { formatDate } from "@/lib/format";
import { getLucideIcon } from "@/lib/lucide-map";
import { cn } from "@/lib/utils";
import type { UserBadgeFront } from "@/types/savings";

export function BadgeCard({
  badge,
  delay = 0,
}: {
  badge: UserBadgeFront;
  delay?: number;
}) {
  const Icon = getLucideIcon(badge.icon);
  const unlocked = badge.unlocked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        "relative rounded-2xl p-5 border transition-all",
        unlocked
          ? "bg-card border-border/60 hover:shadow-md hover:-translate-y-0.5"
          : "bg-muted/40 border-border/40",
      )}
    >
      <div
        className={cn(
          "size-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm",
          unlocked
            ? "bg-gradient-to-br from-sousou-primary to-sousou-primary-600 text-white"
            : "bg-sousou-neutral/15 text-sousou-neutral",
        )}
      >
        {unlocked ? (
          <Icon className="size-7" />
        ) : (
          <Lock className="size-6" />
        )}
      </div>

      <h3
        className={cn(
          "font-serif text-lg leading-tight mb-1",
          unlocked ? "text-sousou-secondary" : "text-sousou-neutral",
        )}
      >
        {badge.name}
      </h3>
      <p className="text-xs text-sousou-neutral leading-relaxed line-clamp-2">
        {badge.description}
      </p>

      {unlocked && badge.unlockedAt && (
        <p className="text-[10px] text-sousou-primary-700 mt-3 font-medium uppercase tracking-wider">
          Débloqué le {formatDate(badge.unlockedAt)}
        </p>
      )}
    </motion.div>
  );
}
