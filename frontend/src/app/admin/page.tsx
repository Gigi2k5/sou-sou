"use client";

import {
  ArrowRight,
  Coins,
  FileText,
  Flag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ActivityChart } from "@/components/admin/activity-chart";
import { RecentArticlesCard } from "@/components/admin/recent-articles-card";
import { RecentReportsCard } from "@/components/admin/recent-reports-card";
import { SignupsChart } from "@/components/admin/signups-chart";
import { StatCard } from "@/components/admin/stat-card";
import { TopContributorsCard } from "@/components/admin/top-contributors-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminOverview } from "@/lib/admin-api";
import { formatMoney } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import type { AdminOverviewStats } from "@/types/admin";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "FCFA";
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getAdminOverview()
      .then((data) => {
        if (alive) setStats(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-serif text-3xl text-sousou-secondary">
            Vue d&apos;ensemble
          </h1>
          <p className="text-sm text-sousou-neutral mt-1">
            Santé de la plateforme.
          </p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-sousou-secondary">
          Vue d&apos;ensemble
        </h1>
        <p className="text-sm text-sousou-neutral mt-1">
          Santé globale de la plateforme.
        </p>
      </header>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<Users className="size-5" />}
          label="Total utilisateurs"
          value={stats.totalUsers.toLocaleString("fr-FR")}
          delta={stats.newUsersDelta}
          badge={
            stats.newUsersThisWeek > 0
              ? `+${stats.newUsersThisWeek} cette semaine`
              : "Aucun cette semaine"
          }
        />
        <StatCard
          icon={<Users className="size-5" />}
          label="Actifs cette semaine"
          value={stats.activeUsers7d.toLocaleString("fr-FR")}
          delta={stats.activeUsersDelta}
          badge="connectés ces 7 derniers jours"
        />
        <StatCard
          icon={<Coins className="size-5" />}
          label="Total cotisations"
          value={formatMoney(stats.totalContributions, currency)}
          badge={`dont ${formatMoney(stats.totalSavingsAmount, currency)} en épargne`}
        />
        <StatCard
          icon={<Flag className="size-5" />}
          label="Signalements en attente"
          value={stats.pendingReports.toLocaleString("fr-FR")}
          href="/admin/reports"
          tone={stats.pendingReports > 0 ? "warning" : "default"}
          badge={
            stats.pendingReports > 0
              ? "À examiner"
              : "Aucun signalement actif"
          }
        />
      </div>

      {/* 2 graphes côte à côte sur desktop, empilés sur mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SignupsChart data={stats.signupsByDay} />
        <ActivityChart data={stats.activityByDay} />
      </div>

      {/* Activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentArticlesCard articles={stats.recentArticles} />
        <RecentReportsCard reports={stats.recentReports} />
        <TopContributorsCard users={stats.topActiveUsers} />
      </div>

      {/* Mini-card "transactions totales" + "articles totaux" en footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
        <FooterTile
          icon={<Coins className="size-4" />}
          label="Transactions totales"
          value={stats.totalTransactions.toLocaleString("fr-FR")}
        />
        <FooterTile
          icon={<FileText className="size-4" />}
          label="Articles publiés"
          value={stats.totalArticles.toLocaleString("fr-FR")}
          href="/admin/articles"
        />
      </div>
    </div>
  );
}

function FooterTile({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 hover:bg-muted/40 transition-colors">
      <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-sousou-neutral">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-sousou-neutral uppercase tracking-wider font-semibold">
          {label}
        </div>
        <div className="font-serif text-lg text-sousou-secondary tabular-nums">
          {value}
        </div>
      </div>
      {href && <ArrowRight className="size-4 text-sousou-neutral" />}
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
