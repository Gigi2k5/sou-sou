"use client";

import { motion } from "framer-motion";
import { LogIn, Plus, Target } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { CreateMoneyPotDialog } from "@/components/money-pots/create-money-pot-dialog";
import { JoinMoneyPotDialog } from "@/components/money-pots/join-money-pot-dialog";
import { MoneyPotCard } from "@/components/money-pots/money-pot-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { listMyMoneyPots } from "@/lib/money-pots-api";
import { useAuth } from "@/providers/auth-provider";
import type { MoneyPotSummary } from "@/types/money-pot";

type Filter = "all" | "solo" | "group";

export default function CotisationsPage() {
  const { user } = useAuth();
  const [pots, setPots] = useState<MoneyPotSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listMyMoneyPots();
      setPots(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currency = user?.currency ?? "FCFA";
  const isEmpty = !loading && pots && pots.length === 0;

  const filtered = useMemo(() => {
    if (!pots) return [];
    if (filter === "solo") return pots.filter((p) => !p.isGroup);
    if (filter === "group") return pots.filter((p) => p.isGroup);
    return pots;
  }, [pots, filter]);

  const counts = useMemo(
    () => ({
      all: pots?.length ?? 0,
      solo: pots?.filter((p) => !p.isGroup).length ?? 0,
      group: pots?.filter((p) => p.isGroup).length ?? 0,
    }),
    [pots],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary inline-flex items-center gap-2">
            <Target className="size-7 text-sousou-primary" />
            Cotisations
          </h1>
          <p className="text-sm text-sousou-neutral mt-1">
            Cotise pour un projet, une sortie, un cadeau — solo ou en groupe.
          </p>
        </div>
        {pots && pots.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setJoinOpen(true)}
            >
              <LogIn className="size-4" />
              Rejoindre
            </Button>
            <Button size="lg" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Créer
            </Button>
          </div>
        )}
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          onCreate={() => setCreateOpen(true)}
          onJoin={() => setJoinOpen(true)}
        />
      ) : (
        <>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTab value="all">
                Toutes <CountPill n={counts.all} />
              </TabsTab>
              <TabsTab value="solo">
                Solo <CountPill n={counts.solo} />
              </TabsTab>
              <TabsTab value="group">
                Groupe <CountPill n={counts.group} />
              </TabsTab>
            </TabsList>
            <TabsPanel value={filter}>
              {filtered.length === 0 ? (
                <p className="text-sm text-sousou-neutral text-center py-8">
                  Rien dans cette catégorie.
                </p>
              ) : (
                <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((p, i) => (
                    <MoneyPotCard
                      key={p.id}
                      pot={p}
                      currency={currency}
                      delay={0.04 * i}
                    />
                  ))}
                </motion.div>
              )}
            </TabsPanel>
          </Tabs>
        </>
      )}

      <CreateMoneyPotDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void refresh()}
      />
      <JoinMoneyPotDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoined={() => void refresh()}
      />
    </div>
  );
}

function CountPill({ n }: { n: number }) {
  return (
    <span className="ml-1.5 text-xs text-sousou-neutral tabular-nums">
      ({n})
    </span>
  );
}

function EmptyState({
  onCreate,
  onJoin,
}: {
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl bg-gradient-to-br from-sousou-primary-50 via-card to-card dark:from-sousou-primary/10 dark:via-card dark:to-card border border-border/60 p-8 sm:p-12 text-center"
    >
      <div className="flex justify-center mb-5">
        <MascotAnimated mood="happy" size="lg" interactive disableConfetti />
      </div>
      <h2 className="font-serif text-2xl sm:text-3xl text-sousou-secondary mb-2">
        Aucune cotisation pour l&apos;instant
      </h2>
      <p className="text-sousou-neutral max-w-md mx-auto mb-6">
        Crée ta cotisation pour un projet ou rejoins-en une avec un code
        d&apos;invitation.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button size="lg" onClick={onCreate}>
          <Plus className="size-4" />
          Créer une cotisation
        </Button>
        <Button variant="outline" size="lg" onClick={onJoin}>
          <LogIn className="size-4" />
          Rejoindre une cotisation
        </Button>
      </div>
    </motion.div>
  );
}
