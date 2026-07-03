"use client";

import { motion } from "framer-motion";
import {
  Award,
  ChevronRight,
  GraduationCap,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";

const ITEMS = [
  {
    href: "/budgets",
    label: "Budgets",
    icon: Wallet,
    desc: "Plafonner tes dépenses par catégorie et être alerté⋅e",
    tint: "bg-sousou-primary-50 text-sousou-primary-700 dark:bg-sousou-primary/15 dark:text-sousou-primary",
  },
  {
    href: "/insights",
    label: "Analyses",
    icon: Sparkles,
    desc: "Comprendre où va ton argent, mois par mois",
    tint: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
  },
  {
    href: "/badges",
    label: "Badges",
    icon: Award,
    desc: "Ta collection débloquée à mesure de tes efforts",
    tint: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  },
  {
    href: "/ressources",
    label: "Vidéos",
    icon: GraduationCap,
    desc: "Des ressources pour apprendre à mieux gérer",
    tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  {
    href: "/parametres",
    label: "Paramètres",
    icon: Settings,
    desc: "Profil, avatars, catégories, thème",
    tint: "bg-muted text-sousou-secondary",
  },
] as const;

/**
 * Page "Plus" : hub d'accès aux features secondaires depuis la bottom nav
 * mobile. Les mêmes features sont directement listées dans la sidebar sur
 * desktop, donc cette page n'est utile qu'en mobile (mais reste accessible
 * partout via `/plus`).
 */
export default function PlusPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary">
          Plus
        </h1>
        <p className="text-sm text-sousou-neutral mt-1">
          Tout ce qui n&apos;est pas dans la barre du bas.
        </p>
      </header>

      <ul className="space-y-2">
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.li
              key={item.href}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 * i }}
            >
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card hover:bg-muted/50 transition-colors p-4"
              >
                <span
                  className={`size-11 rounded-xl inline-flex items-center justify-center shrink-0 ${item.tint}`}
                >
                  <Icon className="size-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sousou-secondary">
                    {item.label}
                  </p>
                  <p className="text-xs text-sousou-neutral truncate">
                    {item.desc}
                  </p>
                </div>
                <ChevronRight className="size-4 text-sousou-neutral shrink-0" />
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
