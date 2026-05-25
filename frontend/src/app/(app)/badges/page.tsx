"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { BadgeCard } from "@/components/savings/badge-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getStats, listBadges } from "@/lib/savings-api";
import type { GamificationStats, UserBadgeFront } from "@/types/savings";

export default function BadgesPage() {
  const [badges, setBadges] = useState<UserBadgeFront[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [b, s] = await Promise.all([listBadges(), getStats()]);
        setBadges(b);
        setStats(s);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary">
          Mes badges
        </h1>
        <p className="text-sm text-sousou-neutral">
          {loading
            ? "Chargement..."
            : `${stats?.unlockedBadges ?? 0} sur ${stats?.totalBadges ?? 0} débloqué${(stats?.totalBadges ?? 0) > 1 ? "s" : ""}.`}
        </p>
      </header>

      {/* Progress bar */}
      {stats && stats.totalBadges > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border/60 p-4"
        >
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-sousou-secondary">Collection</span>
            <span className="text-sousou-neutral tabular-nums">
              {stats.unlockedBadges} / {stats.totalBadges}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-sousou-primary to-sousou-primary-600 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${(stats.unlockedBadges / stats.totalBadges) * 100}%`,
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {unlocked.length > 0 && (
            <section>
              <h2 className="font-serif text-lg text-sousou-secondary mb-3">
                Débloqués ({unlocked.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {unlocked.map((b, i) => (
                  <BadgeCard key={b.id} badge={b} delay={0.04 * i} />
                ))}
              </div>
            </section>
          )}

          {locked.length > 0 && (
            <section>
              <h2 className="font-serif text-lg text-sousou-secondary mb-3">
                À débloquer ({locked.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {locked.map((b, i) => (
                  <BadgeCard key={b.id} badge={b} delay={0.04 * i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
