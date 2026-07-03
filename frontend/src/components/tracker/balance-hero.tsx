"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { useCountUp } from "@/hooks/use-count-up";
import { formatMoney } from "@/lib/format";

export function BalanceHero({
  balance,
  currency,
  rangeLabel,
}: {
  balance: number;
  currency: string;
  rangeLabel: string;
}) {
  const animated = useCountUp(balance);
  const isPositive = balance >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e293b] to-[#334155] text-white p-6 sm:p-8 shadow-xl shadow-sousou-secondary/15"
    >
      {/* glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-sousou-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full bg-sousou-tertiary/15 blur-3xl" />

      <div className="relative flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
            Solde · {rangeLabel}
          </p>
          <p
            className={`mt-3 font-serif text-4xl sm:text-5xl lg:text-6xl leading-none tracking-tight ${
              isPositive ? "text-white" : "text-sousou-tertiary-light"
            }`}
          >
            {formatMoney(animated, currency)}
          </p>
          <p className="mt-3 text-sm text-white/70">
            {isPositive
              ? "Tu épargnes — continue comme ça."
              : "Plus de sorties que d'entrées sur la période."}
          </p>
        </div>

        <Image
          src="/mascot.png"
          alt="Mascotte Sou'Sou"
          width={80}
          height={80}
          className="hidden sm:block size-16 lg:size-20 drop-shadow-lg animate-[float_3s_ease-in-out_infinite]"
        />
      </div>
    </motion.div>
  );
}
