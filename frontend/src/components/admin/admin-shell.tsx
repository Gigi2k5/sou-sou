"use client";

import {
  ArrowLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Shield,
  Users,
  Video,
  X,
  Flag,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

interface AdminNavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/articles", label: "Blog & modération", icon: FileText },
  { href: "/admin/resources", label: "Ressources YouTube", icon: Video },
  { href: "/admin/reports", label: "Signalements", icon: Flag },
  { href: "/admin/broadcasts", label: "Notifications globales", icon: Megaphone },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sécurité supplémentaire au montage côté client : si on est arrivé ici sans
  // être admin (ex: cookie périmé, JWT forgé), on dégage vers /dashboard.
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Ferme le drawer au changement de route
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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
      {/* Sidebar desktop : fixe à gauche, theme navy */}
      <aside
        className={cn(
          "hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col",
          "bg-sousou-secondary text-white px-4 py-6",
        )}
      >
        <SidebarHeader />
        <SidebarNav pathname={pathname} />
        <SidebarFooter user={user} onLogout={handleLogout} />
      </aside>

      {/* Header mobile + bouton burger */}
      <header className="lg:hidden sticky top-0 z-30 bg-sousou-secondary text-white">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu admin"
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-sousou-primary" />
            <span className="text-sm font-semibold">Mode administrateur</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="size-9 text-white/70 hover:bg-white/10 hover:text-white" />
            <Link
              href="/dashboard"
              aria-label="Revenir au site"
              className="p-2 -mr-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Drawer mobile (sidebar overlay) */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-sousou-secondary text-white px-4 py-6 flex flex-col animate-in slide-in-from-left">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Fermer"
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="size-5" />
            </button>
            <SidebarHeader />
            <SidebarNav pathname={pathname} />
            <SidebarFooter user={user} onLogout={handleLogout} />
          </div>
        </div>
      )}

      {/* Bandeau "Mode administrateur" desktop uniquement (déjà dans le header mobile) */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <div className="hidden lg:flex sticky top-0 z-20 bg-sousou-secondary text-white items-center justify-between px-6 h-12 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-sousou-primary" />
            <span className="text-sm font-semibold">Mode administrateur</span>
            {user && (
              <span className="text-xs text-white/60 ml-2">· {user.name}</span>
            )}
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Revenir au site
          </Link>
        </div>

        <main className="flex-1 pb-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarHeader() {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-2 mb-8 px-2"
    >
      <div className="size-8 rounded-lg bg-sousou-primary flex items-center justify-center">
        <Shield className="size-4 text-white" />
      </div>
      <div className="leading-tight">
        <div className="font-serif text-base">Sou&apos;Sou</div>
        <div className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">
          Administration
        </div>
      </div>
    </Link>
  );
}

function SidebarNav({ pathname }: { pathname: string | null }) {
  return (
    <nav className="flex-1 space-y-1">
      {ADMIN_NAV.map((item) => {
        // Match exact pour /admin (sinon il est actif sur toutes les sous-routes),
        // startsWith pour les autres.
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              active
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({
  user,
  onLogout,
}: {
  user: ReturnType<typeof useAuth>["user"];
  onLogout: () => void;
}) {
  if (!user) return null;
  return (
    <div className="mt-6 border-t border-white/10 pt-4 space-y-2">
      <div className="flex items-center gap-3 px-2 py-2 min-w-0">
        <Avatar avatarUrl={user.avatarUrl} name={user.name} size="md" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {user.name}
          </div>
          <div className="text-xs text-white/60 truncate">{user.email}</div>
        </div>
      </div>
      <Link
        href="/dashboard"
        className="lg:hidden flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-4.5" />
        Revenir au site
      </Link>
      <ThemeToggle
        variant="labeled"
        className="w-full text-white/70 hover:bg-white/10 hover:text-white"
      />
      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-sousou-tertiary-light transition-colors"
      >
        <LogOut className="size-4.5" />
        Se déconnecter
      </button>
    </div>
  );
}
