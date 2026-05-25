"use client";

import { motion } from "framer-motion";

import { Avatar } from "@/components/ui/avatar";
import { formatDateRelative, formatMoney } from "@/lib/format";
import type { MoneyPotContribution } from "@/types/money-pot";

export function PaymentsList({
  payments,
  currency,
}: {
  payments: MoneyPotContribution[];
  currency: string;
}) {
  if (payments.length === 0) {
    return (
      <p className="text-sm text-sousou-neutral text-center py-6">
        Aucun paiement pour l&apos;instant.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {payments.map((p, i) => (
        <motion.li
          key={p.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.03 * i }}
          className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3"
        >
          <Avatar
            avatarUrl={p.user.avatarUrl}
            name={p.user.name}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-sousou-secondary truncate">
                {p.user.name}
              </span>
              <span className="text-xs text-sousou-neutral shrink-0">
                {formatDateRelative(p.date)}
              </span>
            </div>
            {p.note && (
              <p className="text-xs text-sousou-neutral mt-0.5 line-clamp-2">
                {p.note}
              </p>
            )}
          </div>
          <span className="text-sm font-semibold text-sousou-primary tabular-nums shrink-0">
            +{formatMoney(p.amount, currency)}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
