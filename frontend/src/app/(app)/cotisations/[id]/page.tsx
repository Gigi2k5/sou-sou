"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  LogOut,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MembersList } from "@/components/money-pots/members-list";
import { PayMoneyPotDialog } from "@/components/money-pots/pay-money-pot-dialog";
import { PaymentsList } from "@/components/money-pots/payments-list";
import { ShareMoneyPotCode } from "@/components/money-pots/share-money-pot-code";
import { ConfettiBurst } from "@/components/savings/confetti-burst";
import { ProgressRing } from "@/components/savings/progress-ring";
import { DeleteConfirmDialog } from "@/components/tracker/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import {
  deleteMoneyPot,
  getMoneyPotDetail,
  leaveMoneyPot,
  listMoneyPotContributions,
} from "@/lib/money-pots-api";
import { useAuth } from "@/providers/auth-provider";
import type {
  MoneyPotContribution,
  MoneyPotDetail,
} from "@/types/money-pot";

export default function MoneyPotDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user } = useAuth();

  const [pot, setPot] = useState<MoneyPotDetail | null>(null);
  const [payments, setPayments] = useState<MoneyPotContribution[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [confetti, setConfetti] = useState(0);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, paymentsList] = await Promise.all([
        getMoneyPotDetail(id),
        listMoneyPotContributions(id),
      ]);
      setPot(detail);
      setPayments(paymentsList);
    } catch {
      setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isOwner = !!user && !!pot && user.id === pot.ownerId;
  const currency = user?.currency ?? "FCFA";

  function handlePaid(paidAmount: number) {
    // Capture le "was completed" à partir du state courant (fonctionnel), pas
    // via une closure sur `pot` qui peut être stale entre 2 clics rapides.
    let wasCompleted = false;
    setPot((current) => {
      wasCompleted = current?.isCompleted ?? false;
      return current;
    });
    void refresh().then(() => {
      setPot((current) => {
        if (current?.isCompleted && !wasCompleted) {
          setConfetti((c) => c + 1);
          toast.success("Objectif atteint !");
        }
        return current;
      });
    });
    toast.success(`+${formatMoney(paidAmount, currency)} cotisé`);
  }

  async function handleLeave() {
    if (!pot) return;
    setActing(true);
    try {
      await leaveMoneyPot(pot.id);
      toast.success("Tu as quitté la cotisation");
      router.push("/cotisations");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Impossible de quitter"));
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!pot) return;
    setActing(true);
    try {
      await deleteMoneyPot(pot.id);
      toast.success("Cotisation supprimée");
      router.push("/cotisations");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  if (forbidden || !pot) {
    return (
      <div className="text-center py-16">
        <h1 className="font-serif text-3xl text-sousou-secondary mb-2">
          Cotisation inaccessible
        </h1>
        <p className="text-sousou-neutral mb-5 max-w-md mx-auto">
          Cette cotisation n&apos;existe pas ou tu n&apos;en es plus membre.
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/cotisations">
              <ArrowLeft className="size-4" />
              Retour aux cotisations
            </Link>
          }
        />
      </div>
    );
  }

  const progress = Math.min(1, pot.currentAmount / pot.targetAmount);
  const percent = Math.round(progress * 100);
  const remaining = Math.max(0, pot.targetAmount - pot.currentAmount);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <ConfettiBurst trigger={confetti} />

      <Link
        href="/cotisations"
        className="inline-flex items-center gap-1.5 text-sm text-sousou-neutral hover:text-sousou-secondary"
      >
        <ArrowLeft className="size-4" />
        Toutes mes cotisations
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        <div className="flex flex-wrap items-start gap-2">
          <span
            className={
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold " +
              (pot.isGroup
                ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200"
                : "bg-sousou-primary-50 text-sousou-primary-700")
            }
          >
            {pot.isGroup ? (
              <>
                <Users className="size-3" /> Groupe · {pot.membersCount} membre
                {pot.membersCount > 1 ? "s" : ""}
              </>
            ) : (
              "Solo"
            )}
          </span>
          {pot.deadline && !pot.isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-sousou-neutral">
              <Calendar className="size-3" />
              Avant le {formatDate(pot.deadline)}
            </span>
          )}
          {pot.isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 px-2.5 py-1 text-[11px] font-semibold">
              <CheckCircle2 className="size-3" />
              Atteinte
            </span>
          )}
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-sousou-secondary leading-tight">
          {pot.name}
        </h1>
        {pot.description && (
          <p className="text-sousou-neutral">{pot.description}</p>
        )}
      </motion.header>

      {/* Cercle de progression géant + bouton paiement */}
      <section
        className={
          "rounded-3xl border border-border/60 bg-gradient-to-br p-6 sm:p-8 flex flex-col items-center text-center " +
          (pot.isCompleted
            ? "from-emerald-50 via-card to-card"
            : "from-sousou-primary-50 via-card to-card")
        }
      >
        <ProgressRing
          progress={progress}
          size={220}
          strokeWidth={16}
          trackColor="rgba(16,185,129,0.15)"
          barColor={
            pot.isCompleted
              ? "#10B981"
              : "url(#sousou-progress-gradient)"
          }
        >
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-sousou-neutral font-semibold">
              {percent}%
            </div>
            <div className="font-serif text-2xl sm:text-3xl text-sousou-secondary tabular-nums mt-1">
              {formatMoney(pot.currentAmount, currency)}
            </div>
            <div className="text-xs text-sousou-neutral tabular-nums mt-0.5">
              / {formatMoney(pot.targetAmount, currency)}
            </div>
          </div>
        </ProgressRing>

        {!pot.isCompleted ? (
          <Button
            type="button"
            size="lg"
            onClick={() => setPayOpen(true)}
            className="mt-6 w-full sm:w-auto sm:min-w-[280px] h-14 text-base"
          >
            <Sparkles className="size-5" />
            J&apos;ajoute {remaining > 0 ? formatMoney(remaining, currency) : ""}
          </Button>
        ) : (
          <p className="mt-6 text-sm text-emerald-700 font-semibold">
            Bravo, l&apos;objectif est atteint le{" "}
            {pot.completedAt && formatDate(pot.completedAt)} !
          </p>
        )}
      </section>

      {pot.isGroup && pot.inviteCode && (
        <ShareMoneyPotCode code={pot.inviteCode} potName={pot.name} />
      )}

      {pot.isGroup && (
        <section>
          <h2 className="font-serif text-xl text-sousou-secondary mb-3">
            Membres
          </h2>
          <MembersList
            members={pot.members}
            ownerId={pot.ownerId}
            currency={currency}
          />
        </section>
      )}

      <section>
        <h2 className="font-serif text-xl text-sousou-secondary mb-3">
          Historique
        </h2>
        <PaymentsList payments={payments ?? []} currency={currency} />
      </section>

      <section className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t border-border/60">
        {isOwner ? (
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Supprimer la cotisation
          </Button>
        ) : pot.isGroup ? (
          <Button
            variant="outline"
            onClick={() => setLeaveOpen(true)}
            className="hover:text-destructive"
          >
            <LogOut className="size-4" />
            Quitter la cotisation
          </Button>
        ) : null}
      </section>

      <PayMoneyPotDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        categoryId={pot.myCategoryId}
        potName={pot.name}
        remaining={remaining}
        currency={currency}
        onPaid={handlePaid}
      />
      <DeleteConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Quitter cette cotisation ?"
        description="Tes paiements précédents sont conservés. Tu pourras revenir avec le code."
        onConfirm={handleLeave}
        loading={acting}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Supprimer « ${pot.name} » ?`}
        description="Tous les paiements et membres seront retirés. Cette action est irréversible."
        onConfirm={handleDelete}
        loading={acting}
      />
    </div>
  );
}
