"use client";

import {
  Award,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  PiggyBank,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand-mark";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AvatarUnlockCelebration } from "@/components/profile/avatar-unlock-celebration";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAvatarUnlocks } from "@/hooks/use-avatar-unlocks";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

interface NavItem {
  href: string;
  label: string;
  /** Label court affiché dans le bottom-nav mobile (place limitée).
   *  Fallback sur `label` si non spécifié. */
  shortLabel?: string;
  icon: typeof LayoutDashboard;
  /** Caché du bottom-nav mobile (mais visible dans la sidebar desktop et /plus). */
  desktopOnly?: boolean;
  /** N'apparaît que sur mobile (le "Plus" est inutile sur desktop). */
  mobileOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Accueil", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", shortLabel: "Suivi", icon: Receipt },
  { href: "/budgets", label: "Budgets", icon: Wallet, desktopOnly: true },
  { href: "/insights", label: "Analyses", icon: Sparkles, desktopOnly: true },
  { href: "/epargne", label: "Épargne", icon: PiggyBank },
  { href: "/cotisations", label: "Cotisations", shortLabel: "Cotise", icon: Target },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/ressources", label: "Vidéos", icon: GraduationCap, desktopOnly: true },
  { href: "/badges", label: "Badges", icon: Award, desktopOnly: true },
  { href: "/plus", label: "Plus", icon: LayoutGrid, mobileOnly: true },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, refresh: refreshAuth } = useAuth();
  const { pending: pendingUnlocks, dismiss: dismissUnlock } =
    useAvatarUnlocks();
  const hasPendingUnlock = pendingUnlocks.length > 0;

  async function handleLogout() {
    try {
      await logout();
      toast.success("À bientôt !");
    } catch {
      toast.error("Déconnexion impossible");
    }
  }

  return (
    <div className="min-h-svh bg-background lg:flex">
      {/* Skip-to-main pour utilisateurs clavier / lecteur d'écran.
          Visible uniquement quand focusé. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-sousou-primary focus:text-white focus:shadow-lg"
      >
        Aller au contenu principal
      </a>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:border-r lg:border-border/60 lg:bg-card lg:px-4 lg:py-6">
        <BrandMark size="md" className="mb-6 px-2" href="/dashboard" />

        {user?.role === "ADMIN" && (
          <Link
            href="/admin"
            className="mb-6 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-sousou-secondary text-white text-sm font-medium hover:bg-sousou-secondary/90 transition-colors"
          >
            <Shield className="size-4 text-sousou-primary" />
            Mode administrateur
          </Link>
        )}

        <nav className="flex-1 space-y-1">
          {NAV.filter((i) => !i.mobileOnly).map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-sousou-primary-50 text-sousou-primary-700 dark:bg-sousou-primary/15 dark:text-sousou-primary"
                    : "text-sousou-neutral hover:bg-muted hover:text-sousou-secondary",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
          {user && <NotificationBell variant="sidebar" />}
        </nav>

        {user && (
          <div className="mt-6 border-t border-border/60 pt-4">
            <Link
              href="/parametres"
              className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl hover:bg-muted transition-colors min-w-0"
            >
              <span className="relative">
                <Avatar
                  avatarUrl={user.avatarUrl}
                  name={user.name}
                  size="md"
                />
                {hasPendingUnlock && <UnlockDot />}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-sousou-secondary truncate">
                  {user.name}
                </div>
                <div className="text-xs text-sousou-neutral truncate">
                  {user.email}
                </div>
              </div>
            </Link>
            <ThemeToggle variant="labeled" className="w-full" />
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                "text-sousou-neutral hover:bg-muted hover:text-destructive transition-colors",
              )}
            >
              <LogOut className="size-5" />
              Se déconnecter
            </button>
          </div>
        )}
      </aside>

      {/* Header mobile */}
      <header className="lg:hidden sticky top-0 z-30 bg-card/85 backdrop-blur-md border-b border-border/60">
        <div className="flex items-center justify-between px-4 h-14">
          <BrandMark size="sm" href="/dashboard" />
          <div className="flex items-center gap-1">
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                aria-label="Mode administrateur"
                className="p-2 rounded-lg bg-sousou-secondary text-white hover:bg-sousou-secondary/90 transition-colors"
              >
                <Shield className="size-4" />
              </Link>
            )}
            <ThemeToggle className="size-9" />
            {user && <NotificationBell />}
            {user && (
              <Link
                href="/parametres"
                className="relative rounded-full focus:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
                aria-label="Mon profil"
              >
                <Avatar avatarUrl={user.avatarUrl} name={user.name} size="sm" />
                {hasPendingUnlock && <UnlockDot />}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main id="main-content" className="flex-1 lg:pl-64 pb-20 lg:pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          {children}
        </div>
      </main>

      {/* Bottom nav mobile : 6 onglets. Le "Profil/Paramètres" reste
          accessible via l'avatar en haut à droite du header mobile. */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-card/95 backdrop-blur-md border-t border-border/60"
        aria-label="Navigation principale"
      >
        <ul className="grid grid-cols-6">
          {NAV.filter(
            (i) => !i.desktopOnly && i.href !== "/parametres",
          ).map((item) => {
            const active =
              item.href === "/plus"
                ? pathname === "/plus"
                : pathname?.startsWith(item.href);
            const Icon = item.icon;
            const displayLabel = item.shortLabel ?? item.label;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 transition-colors",
                    active
                      ? "text-sousou-primary"
                      : "text-sousou-neutral hover:text-sousou-secondary",
                  )}
                >
                  {/* Container fixe : toutes les icônes occupent la même
                      "boîte" visuelle (24×24), quelle que soit la forme de
                      l'icône elle-même (rond, carré, etc.). Harmonise le
                      rendu perçu. */}
                  <span className="inline-flex items-center justify-center size-6">
                    <Icon className="size-5" strokeWidth={active ? 2.25 : 2} />
                  </span>
                  <span className="text-[10px] font-semibold tracking-wide leading-none">
                    {displayLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <AvatarUnlockCelebration
        open={hasPendingUnlock}
        unlock={pendingUnlocks[0] ?? null}
        onClose={dismissUnlock}
        onUserUpdate={() => {
          void refreshAuth();
        }}
      />
    </div>
  );
}

/** Petit point rouge en haut à droite de l'avatar — incite à aller voir
 * la modale de célébration / la liste des avatars. */
function UnlockDot() {
  return (
    <span
      aria-label="Nouvel avatar disponible"
      className={cn(
        "absolute -top-0.5 -right-0.5 size-2.5 rounded-full",
        "bg-sousou-tertiary ring-2 ring-card",
      )}
    />
  );
}
