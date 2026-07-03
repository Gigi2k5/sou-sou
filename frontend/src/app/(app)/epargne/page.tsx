"use client";

import { motion } from "framer-motion";
import {
  Award,
  Calendar,
  CheckCircle2,
  Coins,
  Flame,
  Pencil,
  Plus,
  Star,
  Trash2,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MascotBubble } from "@/components/mascot/mascot-bubble";
import { BadgeCard } from "@/components/savings/badge-card";
import { ConfettiBurst } from "@/components/savings/confetti-burst";
import { ContributeDialog } from "@/components/savings/contribute-dialog";
import { GoalEmpty } from "@/components/savings/goal-empty";
import { GoalFormDialog } from "@/components/savings/goal-form";
import { ProgressRing } from "@/components/savings/progress-ring";
import { StreakFlame } from "@/components/savings/streak-flame";
import { DeleteConfirmDialog } from "@/components/tracker/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMascotMessage } from "@/hooks/use-mascot-message";
import { extractApiErrorMessage } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { getLucideIcon } from "@/lib/lucide-map";
import {
  deleteGoal,
  getGoal,
  getStats,
  listBadges,
  listContributions,
} from "@/lib/savings-api";
import { deleteTransaction } from "@/lib/tracker-api";
import { useAuth } from "@/providers/auth-provider";
import type {
  GamificationStats,
  SavingsContribution,
  SavingsGoal,
  UserBadgeFront,
} from "@/types/savings";

export default function EpargnePage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "FCFA";
  const mascot = useMascotMessage("savings");

  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [contributions, setContributions] = useState<SavingsContribution[]>([]);
  const [badges, setBadges] = useState<UserBadgeFront[]>([]);
  const [loading, setLoading] = useState(true);

  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [deleteGoalOpen, setDeleteGoalOpen] = useState(false);
  const [deleteContrib, setDeleteContrib] = useState<SavingsContribution | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const g = await getGoal();
      setGoal(g);
      if (g) {
        const [s, contribs, b] = await Promise.all([
          getStats(),
          listContributions(),
          listBadges(),
        ]);
        setStats(s);
        setContributions(contribs);
        setBadges(b);
      } else {
        const [s, b] = await Promise.all([getStats(), listBadges()]);
        setStats(s);
        setBadges(b);
        setContributions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const progress = goal
    ? Math.max(0, Math.min(1, goal.currentAmount / goal.targetAmount))
    : 0;
  const pctRounded = Math.round(progress * 100);

  const daysLeft = useMemo(() => {
    if (!goal) return 0;
    const ms = new Date(goal.deadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
  }, [goal]);

  async function handleContributed(paidAmount: number) {
    // Snapshot avant refresh pour calculer les deltas (points, streak, badges,
    // completion). La Transaction est déjà créée — le hook backend a déjà
    // appliqué progression, gamification, badges, avatars.
    const prevGoal = goal;
    const prevStats = stats;
    const prevBadgeIds = new Set(
      badges.filter((b) => b.unlocked).map((b) => b.id),
    );

    // Le refresh + les 3 fetchs suivants ne doivent pas faire planter
    // silencieusement handleContributed (fire-and-forget côté dialog).
    let freshGoal: SavingsGoal | null = null;
    let freshStats: GamificationStats | null = null;
    let freshBadges: UserBadgeFront[] = [];
    try {
      await refresh();
      [freshGoal, freshStats, freshBadges] = await Promise.all([
        getGoal(),
        getStats(),
        listBadges(),
      ]);
    } catch {
      // Réseau flaky : on affiche quand même le toast principal en s'appuyant
      // sur les valeurs snapshots.
      toast.success(`+${formatMoney(paidAmount, currency)} épargnés`);
      return;
    }

    const pointsDiff =
      (freshStats?.totalPoints ?? 0) - (prevStats?.totalPoints ?? 0);
    const newStreak = freshStats?.currentStreak ?? 0;
    const justCompleted =
      !!freshGoal?.isCompleted && !prevGoal?.isCompleted;
    const newlyUnlocked = freshBadges.filter(
      (b) => b.unlocked && !prevBadgeIds.has(b.id),
    );

    toast.success(`+${formatMoney(paidAmount, currency)} épargnés`, {
      description: pointsDiff > 0 ? `+${pointsDiff} pts · streak ${newStreak}` : undefined,
    });

    for (const badge of newlyUnlocked) {
      const Icon = getLucideIcon(badge.icon);
      toast.success(`Badge débloqué — ${badge.name}`, {
        description: badge.description,
        icon: <Icon className="size-5" />,
        duration: 4000,
      });
    }

    if (justCompleted) {
      setConfettiTrigger((t) => t + 1);
      toast.success("Objectif atteint !", {
        description: "Bravo, tu peux en lancer un nouveau quand tu veux.",
        duration: 6000,
      });
      mascot.override(
        {
          mood: "flying",
          message:
            "OBJECTIF ATTEINT ! Tu es incroyable, savoure cette victoire !",
          emoji: "🏆",
        },
        6000,
      );
    } else if (pointsDiff > 0) {
      mascot.override({
        mood: "celebrating",
        message: `Bien joué ! +${pointsDiff} pts, streak ${newStreak}.`,
        emoji: "🎉",
      });
    }
  }

  async function handleDeleteGoal() {
    setDeleting(true);
    try {
      await deleteGoal();
      toast.success("Objectif supprimé");
      setDeleteGoalOpen(false);
      await refresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteContrib() {
    if (!deleteContrib) return;
    setDeleting(true);
    try {
      // Une "contribution" = une Transaction expense. La suppression passe par
      // /transactions/:id ; le hook backend reévalue la complétion du goal.
      await deleteTransaction(deleteContrib.id);
      toast.success("Contribution annulée");
      setDeleteContrib(null);
      await refresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
    } finally {
      setDeleting(false);
    }
  }

  // Loading state
  if (loading && !goal) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }

  // Empty state
  if (!goal) {
    return (
      <>
        <header className="mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary">
            Épargne
          </h1>
          <p className="text-sm text-sousou-neutral">
            Définis un objectif et constate ta progression.
          </p>
        </header>

        {mascot.message && (
          <div className="mb-6">
            <MascotBubble
              mood={mascot.message.mood}
              message={mascot.message.message}
              emoji={mascot.message.emoji}
              size="md"
              interactive
              disableConfetti
            />
          </div>
        )}

        <GoalEmpty onCreate={() => setGoalFormOpen(true)} />

        <GoalFormDialog
          open={goalFormOpen}
          onOpenChange={setGoalFormOpen}
          onSaved={() => {
            void refresh();
          }}
        />

        {badges.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-xl text-sousou-secondary mb-4">
              Badges à débloquer
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {badges.slice(0, 4).map((b, i) => (
                <BadgeCard key={b.id} badge={b} delay={0.05 * i} />
              ))}
            </div>
          </section>
        )}
      </>
    );
  }

  return (
    <>
      <ConfettiBurst trigger={confettiTrigger} />

      <div className="space-y-6">
        {mascot.message && (
          <MascotBubble
            mood={mascot.message.mood}
            message={mascot.message.message}
            emoji={mascot.message.emoji}
            size="md"
            interactive
            disableConfetti
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary">
              {goal.name}
            </h1>
            <p className="text-sm text-sousou-neutral">
              Échéance le {formatDate(goal.deadline)} · {daysLeft} jour
              {daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setGoalFormOpen(true)}
              aria-label="Modifier"
              disabled={goal.isCompleted}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleteGoalOpen(true)}
              aria-label="Supprimer"
              className="hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* Hero progress ring */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e293b] to-[#334155] text-white p-6 sm:p-8 shadow-xl shadow-sousou-secondary/15"
        >
          <div className="pointer-events-none absolute -top-32 -right-24 size-72 rounded-full bg-sousou-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full bg-sousou-tertiary/15 blur-3xl" />

          <div className="relative grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 sm:gap-8 items-center">
            <ProgressRing progress={progress} size={210} strokeWidth={16}>
              <div className="text-center">
                <div className="font-serif text-4xl sm:text-5xl leading-none">
                  {pctRounded}
                  <span className="text-2xl">%</span>
                </div>
                {goal.isCompleted && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs uppercase tracking-wider text-sousou-primary-50 font-semibold">
                    <CheckCircle2 className="size-3.5" /> Atteint
                  </div>
                )}
              </div>
            </ProgressRing>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-1">
                  Mis de côté
                </p>
                <p className="font-serif text-3xl sm:text-4xl tabular-nums">
                  {formatMoney(goal.currentAmount, currency)}
                </p>
                <p className="text-sm text-white/60 mt-1">
                  sur {formatMoney(goal.targetAmount, currency)}
                </p>
              </div>

              <Button
                size="lg"
                disabled={goal.isCompleted}
                onClick={() => setContributeOpen(true)}
                className="w-full sm:w-auto px-8 h-12"
              >
                <Plus className="size-5" />
                {goal.isCompleted
                  ? "Objectif atteint"
                  : "Je contribue aujourd'hui"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            icon={<Flame className="size-4.5 text-orange-500" />}
            label="Streak"
            value={`${stats?.currentStreak ?? 0}`}
            sub={
              (stats?.currentStreak ?? 0) <= 1 ? "jour" : "jours d'affilée"
            }
            badge={<StreakFlame streak={stats?.currentStreak ?? 0} size="sm" />}
          />
          <StatTile
            icon={<Star className="size-4.5 text-sousou-primary" />}
            label="Points"
            value={`${stats?.totalPoints ?? 0}`}
            sub="cumulés"
          />
          <StatTile
            icon={<Trophy className="size-4.5 text-amber-500" />}
            label="Meilleur"
            value={`${stats?.bestStreak ?? 0}`}
            sub={(stats?.bestStreak ?? 0) <= 1 ? "jour" : "jours"}
          />
          <StatTile
            icon={<Award className="size-4.5 text-sousou-tertiary" />}
            label="Badges"
            value={`${stats?.unlockedBadges ?? 0}`}
            sub={`sur ${stats?.totalBadges ?? 0}`}
          />
        </div>

        {/* History + badges */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-3xl bg-card border border-border/60 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-sousou-secondary">
                Historique
              </h2>
              <span className="text-sm text-sousou-neutral">
                {contributions.length} contribution
                {contributions.length > 1 ? "s" : ""}
              </span>
            </div>

            {contributions.length === 0 ? (
              <p className="text-sm text-sousou-neutral text-center py-8">
                Aucune contribution pour l&apos;instant. Lance le mouvement avec
                ta première !
              </p>
            ) : (
              <ul className="space-y-1 max-h-96 overflow-y-auto pr-1">
                {contributions.map((c, i) => (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.02 * i, duration: 0.25 }}
                    className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/40 transition-colors"
                  >
                    <div className="size-9 rounded-lg bg-sousou-primary-50 text-sousou-primary-700 flex items-center justify-center shrink-0">
                      <Coins className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sousou-secondary truncate">
                        {formatMoney(c.amount, currency)}
                      </p>
                      <p className="text-xs text-sousou-neutral flex items-center gap-1.5">
                        <Calendar className="size-3" />
                        {formatDate(c.date)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDeleteContrib(c)}
                      className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity hover:text-destructive"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-3xl bg-card border border-border/60 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-sousou-secondary">
                Mes badges
              </h2>
              <Link
                href="/badges"
                className="text-sm text-sousou-primary hover:underline"
              >
                Tout voir
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {badges.slice(0, 4).map((b, i) => (
                <BadgeCard key={b.id} badge={b} delay={0.05 * i} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dialogs */}
      <GoalFormDialog
        open={goalFormOpen}
        onOpenChange={setGoalFormOpen}
        initial={goal}
        onSaved={(g) => setGoal(g)}
      />
      <ContributeDialog
        open={contributeOpen}
        onOpenChange={setContributeOpen}
        goal={goal}
        currency={currency}
        onContributed={handleContributed}
      />
      <DeleteConfirmDialog
        open={deleteGoalOpen}
        onOpenChange={setDeleteGoalOpen}
        title="Supprimer l'objectif ?"
        description="Toutes tes contributions liées seront supprimées avec lui. Tes points et badges restent acquis."
        onConfirm={handleDeleteGoal}
        loading={deleting}
      />
      <DeleteConfirmDialog
        open={!!deleteContrib}
        onOpenChange={(o) => !o && setDeleteContrib(null)}
        title="Annuler cette contribution ?"
        description="Le montant sera retiré de ta progression. Les points et streak gagnés ne sont pas remboursés."
        onConfirm={handleDeleteContrib}
        loading={deleting}
      />
    </>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 flex items-center gap-3">
      {badge ?? (
        <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-sousou-neutral uppercase tracking-wider font-semibold">
          {label}
        </p>
        <p className="font-serif text-xl text-sousou-secondary leading-none tabular-nums">
          {value}
          <span className="ml-1 text-xs text-sousou-neutral font-sans">
            {sub}
          </span>
        </p>
      </div>
    </div>
  );
}
