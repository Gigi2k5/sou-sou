"use client";

import {
  ArrowLeft,
  Award,
  Ban,
  Coins,
  Crown,
  FileText,
  Flame,
  PiggyBank,
  Receipt,
  Shield,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { BanUserDialog } from "@/components/admin/ban-user-dialog";
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog";
import { UpdateRoleDialog } from "@/components/admin/update-role-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { getAdminUserDetail, unbanAdminUser } from "@/lib/admin-users-api";
import { formatDate, formatDateRelative, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { AdminUserDetail } from "@/types/admin-users";

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user: currentAdmin } = useAuth();

  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [banOpen, setBanOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actingUnban, setActingUnban] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await getAdminUserDetail(id);
      setData(d);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Chargement impossible"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleUnban() {
    if (!id) return;
    setActingUnban(true);
    try {
      await unbanAdminUser(id);
      toast.success("Utilisateur débanni");
      await refresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Débannissement impossible"));
    } finally {
      setActingUnban(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const { user, stats, recentActivity } = data;
  const currency = user.currency || "FCFA";
  const isSelf = currentAdmin?.id === user.id;
  const isAnonymized = user.email.startsWith("deleted-");

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-sousou-neutral hover:text-sousou-secondary"
      >
        <ArrowLeft className="size-4" />
        Tous les utilisateurs
      </Link>

      {/* Header user */}
      <header className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar
            avatarUrl={user.avatarUrl}
            name={user.name}
            size="2xl"
            bordered
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary">
                {user.name}
              </h1>
              {user.role === "ADMIN" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sousou-secondary text-white px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold">
                  <Crown className="size-3" />
                  Admin
                </span>
              )}
              {user.status === "banned" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sousou-tertiary/10 text-sousou-tertiary px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold">
                  <Ban className="size-3" />
                  Banni
                </span>
              )}
              {user.status === "inactive" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-sousou-neutral px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold">
                  Inactif
                </span>
              )}
            </div>
            <p className="text-sm text-sousou-neutral truncate">
              {user.email}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-sousou-neutral">
              <span>Inscrit le {formatDate(user.createdAt)}</span>
              {user.lastLoginAt && (
                <span>
                  Dernière connexion : {formatDateRelative(user.lastLoginAt)}
                </span>
              )}
              <span>{user.currency}</span>
            </div>
            {user.status === "banned" && user.banReason && (
              <div className="mt-3 rounded-xl bg-sousou-tertiary/10 border border-sousou-tertiary/30 px-3 py-2 text-xs text-sousou-tertiary">
                <strong>Raison du ban :</strong> {user.banReason}
                {user.bannedAt && ` · ${formatDate(user.bannedAt)}`}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isSelf && !isAnonymized && (
          <div className="mt-5 flex flex-wrap gap-2">
            {user.status === "banned" ? (
              <Button
                variant="outline"
                onClick={handleUnban}
                disabled={actingUnban}
              >
                <UserCheck className="size-4" />
                {actingUnban ? "..." : "Débannir"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setBanOpen(true)}
                className="hover:text-destructive"
              >
                <Ban className="size-4" />
                Bannir
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setRoleOpen(true)}
            >
              <UserCog className="size-4" />
              {user.role === "ADMIN" ? "Rétrograder" : "Promouvoir admin"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Supprimer le compte
            </Button>
          </div>
        )}
        {isSelf && (
          <p className="mt-5 text-xs text-sousou-neutral">
            <Shield className="inline size-3 mr-1" />
            C&apos;est ton propre compte — aucune action de modération possible
            ici.
          </p>
        )}
        {isAnonymized && (
          <p className="mt-5 text-xs text-sousou-neutral">
            <Sparkles className="inline size-3 mr-1" />
            Ce compte a été supprimé. Les données privées ont été effacées,
            l&apos;historique public est conservé en anonyme.
          </p>
        )}
      </header>

      {/* Statistiques agrégées (privées non visibles) */}
      <section>
        <h2 className="font-serif text-xl text-sousou-secondary mb-3">
          Statistiques
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatTile
            icon={<Receipt className="size-4" />}
            label="Transactions"
            value={stats.totalTransactions.toLocaleString("fr-FR")}
          />
          <StatTile
            icon={<Coins className="size-4" />}
            label="Cotisations totales"
            value={formatMoney(stats.totalContributions, currency)}
            small
          />
          <StatTile
            icon={<PiggyBank className="size-4" />}
            label="Épargne"
            value={formatMoney(stats.totalSavings, currency)}
            small
          />
          <StatTile
            icon={<FileText className="size-4" />}
            label="Articles"
            value={stats.totalArticles.toLocaleString("fr-FR")}
          />
          <StatTile
            icon={<Flame className="size-4" />}
            label="Streak actuel"
            value={`${stats.currentStreak} j`}
          />
          <StatTile
            icon={<Trophy className="size-4" />}
            label="Meilleur streak"
            value={`${stats.bestStreak} j`}
          />
          <StatTile
            icon={<Award className="size-4" />}
            label="Badges"
            value={`${stats.badgesUnlocked}`}
          />
          <StatTile
            icon={<Sparkles className="size-4" />}
            label="Avatars"
            value={`${stats.avatarsUnlocked}`}
          />
          <StatTile
            icon={<Target className="size-4" />}
            label="Pots créés"
            value={`${stats.ownedMoneyPotsCount}`}
          />
          <StatTile
            icon={<Users className="size-4" />}
            label="Pots rejoints"
            value={`${stats.moneyPotMembershipsCount}`}
          />
        </div>
      </section>

      {/* Activité récente */}
      <section>
        <h2 className="font-serif text-xl text-sousou-secondary mb-3">
          Activité récente
        </h2>
        {recentActivity.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-sousou-neutral">
            Aucune activité enregistrée pour cet utilisateur.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {recentActivity.map((a, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl bg-card border border-border/60 px-3 py-2.5"
              >
                <ActivityIcon type={a.type} />
                <span className="flex-1 text-sm text-sousou-secondary truncate">
                  {a.label}
                </span>
                <span className="text-xs text-sousou-neutral shrink-0 tabular-nums">
                  {formatDateRelative(a.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Dialogs */}
      <BanUserDialog
        open={banOpen}
        onOpenChange={setBanOpen}
        userId={user.id}
        userName={user.name}
        onBanned={() => {
          void refresh();
        }}
      />
      <UpdateRoleDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        userId={user.id}
        userName={user.name}
        currentRole={user.role}
        onUpdated={() => {
          void refresh();
        }}
      />
      <DeleteUserDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        userId={user.id}
        userName={user.name}
        userEmail={user.email}
        onDeleted={() => {
          router.push("/admin/users");
        }}
      />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3.5">
      <div className="flex items-center gap-2 text-sousou-neutral">
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-semibold">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "mt-1.5 font-serif text-sousou-secondary tabular-nums",
          small ? "text-base" : "text-xl",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ActivityIcon({ type }: { type: AdminUserDetail["recentActivity"][number]["type"] }) {
  const map = {
    TRANSACTION_INCOME: Coins,
    TRANSACTION_EXPENSE: Receipt,
    ARTICLE: FileText,
    AVATAR_UNLOCK: Sparkles,
    BADGE_UNLOCK: Award,
    POT_CREATED: Target,
    POT_JOINED: Users,
  } as const;
  const Icon = map[type];
  return (
    <span className="size-7 rounded-lg bg-muted flex items-center justify-center text-sousou-neutral shrink-0">
      <Icon className="size-3.5" />
    </span>
  );
}
