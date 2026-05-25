"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Award,
  Bell,
  CheckCircle2,
  EyeOff,
  Flame,
  Heart,
  Megaphone,
  MessageCircle,
  PartyPopper,
  Sparkles,
  Target,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { getLucideIcon } from "@/lib/lucide-map";
import { formatDateRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotifType } from "@/types/notification";

interface TypeMeta {
  icon: typeof Bell;
  tint: string;
  href: (data: Record<string, unknown> | null) => string;
}

const FALLBACK_META: TypeMeta = {
  icon: Bell,
  tint: "bg-muted text-sousou-neutral",
  href: () => "/dashboard",
};

const TYPE_META: Record<NotifType, TypeMeta> = {
  CONTRIBUTION_REMINDER: {
    icon: Bell,
    tint: "bg-sousou-primary-50 text-sousou-primary-700",
    href: () => "/epargne",
  },
  STREAK_AT_RISK: {
    icon: Flame,
    tint: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-200",
    href: () => "/epargne",
  },
  BADGE_UNLOCKED: {
    icon: Award,
    tint: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200",
    href: () => "/badges",
  },
  GOAL_COMPLETED: {
    icon: PartyPopper,
    tint: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200",
    href: () => "/epargne",
  },
  AVATAR_UNLOCKED: {
    icon: Sparkles,
    tint: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200",
    href: () => "/parametres",
  },
  CONTRIBUTION_GOAL_PROGRESS: {
    icon: Target,
    tint: "bg-sousou-primary-50 text-sousou-primary-700",
    href: (data) => {
      const id = data?.moneyPotId;
      return typeof id === "string" ? `/cotisations/${id}` : "/cotisations";
    },
  },
  CONTRIBUTION_GOAL_COMPLETED: {
    icon: CheckCircle2,
    tint: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200",
    href: (data) => {
      const id = data?.moneyPotId;
      return typeof id === "string" ? `/cotisations/${id}` : "/cotisations";
    },
  },
  CONTRIBUTION_NEW_MEMBER: {
    icon: Users,
    tint: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200",
    href: (data) => {
      const id = data?.moneyPotId;
      return typeof id === "string" ? `/cotisations/${id}` : "/cotisations";
    },
  },
  CONTRIBUTION_PAYMENT_RECEIVED: {
    icon: Sparkles,
    tint: "bg-sousou-primary-50 text-sousou-primary-700",
    href: (data) => {
      const id = data?.moneyPotId;
      return typeof id === "string" ? `/cotisations/${id}` : "/cotisations";
    },
  },
  // -- Admin (V3) ------------------------------------------------------------
  ADMIN_WARNING: {
    icon: AlertTriangle,
    tint: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200",
    href: () => "/dashboard",
  },
  ADMIN_HIDE_NOTICE: {
    icon: EyeOff,
    tint: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-200",
    href: () => "/blog",
  },
  ADMIN_DELETE_NOTICE: {
    icon: Trash2,
    tint: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200",
    href: () => "/blog",
  },
  ADMIN_BROADCAST: {
    icon: Megaphone,
    tint: "bg-sousou-primary-50 text-sousou-primary-700 dark:bg-sousou-primary/15 dark:text-sousou-primary",
    href: () => "/dashboard",
  },
  // -- Budgets (V4) ----------------------------------------------------------
  BUDGET_WARNING: {
    icon: Wallet,
    tint: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200",
    href: () => "/budgets",
  },
  BUDGET_EXCEEDED: {
    icon: Wallet,
    tint: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200",
    href: () => "/budgets",
  },
  // -- Likes & comments (V4) -------------------------------------------------
  ARTICLE_LIKED: {
    icon: Heart,
    tint: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200",
    href: (data) => {
      const slug = data?.articleSlug;
      return typeof slug === "string" ? `/blog/${slug}` : "/blog";
    },
  },
  ARTICLE_COMMENTED: {
    icon: MessageCircle,
    tint: "bg-sousou-primary-50 text-sousou-primary-700 dark:bg-sousou-primary/15 dark:text-sousou-primary",
    href: (data) => {
      const slug = data?.articleSlug;
      return typeof slug === "string" ? `/blog/${slug}` : "/blog";
    },
  },
};

export function NotificationItem({
  notif,
  onActivate,
  onDelete,
  index,
}: {
  notif: AppNotification;
  onActivate: (notif: AppNotification) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  index: number;
}) {
  const router = useRouter();
  // Fallback défensif : si le backend ajoute un nouveau type avant que le front
  // ne soit mis à jour, on évite le crash et on rend une notif neutre.
  const meta = TYPE_META[notif.type] ?? FALLBACK_META;
  const Icon =
    notif.type === "BADGE_UNLOCKED" && typeof notif.data?.icon === "string"
      ? getLucideIcon(notif.data.icon)
      : meta.icon;

  async function handleClick() {
    await onActivate(notif);
    router.push(meta.href(notif.data));
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    void onDelete(notif.id);
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.02 * index }}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "group w-full text-left flex items-start gap-3 px-4 py-3 transition-colors",
          "hover:bg-muted focus-visible:bg-muted focus:outline-none",
          !notif.isRead && "bg-sousou-primary-50/40",
        )}
      >
        <span
          className={cn(
            "shrink-0 size-10 rounded-full inline-flex items-center justify-center",
            meta.tint,
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm leading-tight truncate",
                notif.isRead
                  ? "text-sousou-secondary"
                  : "font-semibold text-sousou-secondary",
              )}
            >
              {notif.title}
            </span>
            {!notif.isRead && (
              <span
                aria-label="Non lu"
                className="shrink-0 size-2 rounded-full bg-sousou-primary"
              />
            )}
          </span>
          <span className="block text-sm text-sousou-neutral mt-0.5 line-clamp-2">
            {notif.body}
          </span>
          <span className="block text-xs text-sousou-neutral/80 mt-1">
            {formatDateRelative(notif.createdAt)}
          </span>
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-label="Supprimer"
          onClick={handleDelete}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleDelete(e as unknown as React.MouseEvent);
            }
          }}
          className={cn(
            "shrink-0 size-8 rounded-full inline-flex items-center justify-center",
            "text-sousou-neutral/60 opacity-0 group-hover:opacity-100",
            "hover:bg-card hover:text-destructive transition-all",
            "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/30 focus:outline-none",
          )}
        >
          <Trash2 className="size-4" />
        </span>
      </button>
    </motion.li>
  );
}
