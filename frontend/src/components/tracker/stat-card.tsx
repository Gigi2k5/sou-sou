"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

import { useCountUp } from "@/hooks/use-count-up";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Variant = "primary" | "tertiary" | "secondary";

const variantStyles: Record<
  Variant,
  { tile: string; iconWrap: string; icon: string }
> = {
  primary: {
    tile: "bg-sousou-primary-50",
    iconWrap: "bg-sousou-primary text-white",
    icon: "text-white",
  },
  tertiary: {
    tile: "bg-sousou-tertiary/10",
    iconWrap: "bg-sousou-tertiary text-white",
    icon: "text-white",
  },
  secondary: {
    tile: "bg-sousou-secondary/5",
    iconWrap: "bg-sousou-secondary text-white",
    icon: "text-white",
  },
};

export function StatCard({
  label,
  amount,
  value,
  suffix,
  currency = "FCFA",
  icon: Icon,
  variant = "primary",
  delay = 0,
}: {
  label: string;
  /** Si fourni, affiché formaté en monnaie (avec count-up) */
  amount?: number;
  /** Sinon, valeur brute affichée telle quelle */
  value?: ReactNode;
  /** Suffixe affiché après `value` (ex: "jours") */
  suffix?: string;
  currency?: string;
  icon: LucideIcon;
  variant?: Variant;
  delay?: number;
}) {
  const animated = useCountUp(amount ?? 0);
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      className={cn(
        "rounded-2xl p-5 border border-border/40",
        styles.tile,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wide text-sousou-neutral font-semibold">
          {label}
        </p>
        <div
          className={cn(
            "size-9 rounded-xl flex items-center justify-center shadow-sm",
            styles.iconWrap,
          )}
        >
          <Icon className={cn("size-4.5", styles.icon)} />
        </div>
      </div>
      <p className="font-serif text-2xl sm:text-3xl text-sousou-secondary leading-none tabular-nums">
        {amount !== undefined ? (
          formatMoney(animated, currency)
        ) : (
          <>
            {value}
            {suffix && (
              <span className="text-sm text-sousou-neutral font-sans ml-1.5">
                {suffix}
              </span>
            )}
          </>
        )}
      </p>
    </motion.div>
  );
}
