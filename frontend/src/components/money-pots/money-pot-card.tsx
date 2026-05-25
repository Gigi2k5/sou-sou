"use client";

import { motion } from "framer-motion";
import { Calendar, CheckCircle2, User, Users } from "lucide-react";
import Link from "next/link";

import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MoneyPotSummary } from "@/types/money-pot";

export function MoneyPotCard({
  pot,
  currency,
  delay = 0,
}: {
  pot: MoneyPotSummary;
  currency: string;
  delay?: number;
}) {
  const percent = Math.min(
    100,
    Math.round((pot.currentAmount / pot.targetAmount) * 100),
  );
  const remaining = Math.max(0, pot.targetAmount - pot.currentAmount);
  const daysLeft = pot.deadline ? daysBetween(new Date(), pot.deadline) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Link
        href={`/cotisations/${pot.id}`}
        className={cn(
          "block rounded-3xl border border-border/60 bg-card p-5 transition-all",
          "hover:border-sousou-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
          pot.isCompleted && "bg-gradient-to-br from-emerald-50 via-card to-card",
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-xl text-sousou-secondary leading-tight truncate">
              {pot.name}
            </h3>
            {pot.description && (
              <p className="text-xs text-sousou-neutral mt-1 line-clamp-2">
                {pot.description}
              </p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              pot.isGroup
                ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200"
                : "bg-sousou-primary-50 text-sousou-primary-700",
            )}
          >
            {pot.isGroup ? (
              <>
                <Users className="size-3" /> Groupe
              </>
            ) : (
              <>
                <User className="size-3" /> Solo
              </>
            )}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-end justify-between gap-2">
            <span className="text-lg font-serif tabular-nums text-sousou-secondary">
              {formatMoney(pot.currentAmount, currency)}
            </span>
            <span className="text-xs text-sousou-neutral tabular-nums">
              / {formatMoney(pot.targetAmount, currency)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                pot.isCompleted ? "bg-emerald-500" : "bg-sousou-primary",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-sousou-neutral">
            <span className="font-semibold tabular-nums">{percent}%</span>
            {!pot.isCompleted && remaining > 0 && (
              <span className="tabular-nums">
                Reste {formatMoney(remaining, currency)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-4 text-xs text-sousou-neutral">
          {pot.isGroup && (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" />
              {pot.membersCount} membre{pot.membersCount > 1 ? "s" : ""}
            </span>
          )}
          {pot.deadline && !pot.isCompleted && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {daysLeft !== null && daysLeft >= 0
                ? `${daysLeft}j restants`
                : "Échéance dépassée"}
            </span>
          )}
          {pot.isCompleted && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold ml-auto">
              <CheckCircle2 className="size-3.5" />
              Atteinte{" "}
              {pot.completedAt && formatDate(pot.completedAt, { month: "short", day: "2-digit" })}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function daysBetween(from: Date, to: string | Date): number {
  const d = typeof to === "string" ? new Date(to) : to;
  return Math.ceil((d.getTime() - from.getTime()) / 86_400_000);
}
