"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MoneyPotMember } from "@/types/money-pot";

/**
 * Mini-leaderboard des membres d'une cotisation groupe : avatar + nom +
 * total cotisé. Trié par total descendant côté backend.
 */
export function MembersList({
  members,
  ownerId,
  currency,
}: {
  members: MoneyPotMember[];
  ownerId: string;
  currency: string;
}) {
  return (
    <ul className="rounded-3xl border border-border/60 bg-card divide-y divide-border/60">
      {members.map((m, i) => {
        const isOwner = m.userId === ownerId;
        return (
          <motion.li
            key={m.userId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.04 * i }}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              m.isMe && "bg-sousou-primary-50/50",
            )}
          >
            <span className="text-sm font-bold text-sousou-neutral tabular-nums w-5 text-right">
              {i + 1}
            </span>
            <Avatar
              avatarUrl={m.avatarUrl}
              name={m.name}
              size="sm"
              bordered={m.isMe}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-sm truncate",
                    m.isMe
                      ? "font-semibold text-sousou-secondary"
                      : "text-sousou-secondary",
                  )}
                >
                  {m.name} {m.isMe && <span className="text-xs text-sousou-neutral">(toi)</span>}
                </span>
                {isOwner && (
                  <Crown
                    className="size-3.5 text-amber-500"
                    aria-label="Créateur"
                  />
                )}
              </div>
            </div>
            <span className="text-sm font-semibold text-sousou-secondary tabular-nums">
              {formatMoney(m.totalContributed, currency)}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
