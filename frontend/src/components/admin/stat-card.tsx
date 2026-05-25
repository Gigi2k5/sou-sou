import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function StatCard({
  icon,
  label,
  value,
  delta,
  href,
  badge,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** Pourcentage signé (+15, -3.5) ou null si pas de comparaison disponible. */
  delta?: number | null;
  href?: string;
  /** Petit label sous la valeur (ex: "+12 cette semaine"). */
  badge?: string;
  /** "default" | "warning" — la variante warning passe l'icône en corail. */
  tone?: "default" | "warning";
}) {
  const content = (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 sm:p-5 transition-shadow",
        href && "hover:shadow-sm cursor-pointer",
        tone === "warning"
          ? "border-sousou-tertiary/40"
          : "border-border/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "size-10 rounded-xl flex items-center justify-center shrink-0",
            tone === "warning"
              ? "bg-sousou-tertiary/10 text-sousou-tertiary"
              : "bg-sousou-primary-50 text-sousou-primary-700",
          )}
        >
          {icon}
        </div>
        {delta !== undefined && delta !== null && <DeltaBadge delta={delta} />}
      </div>
      <p className="mt-3 text-xs text-sousou-neutral uppercase tracking-wider font-semibold">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl sm:text-3xl text-sousou-secondary leading-none tabular-nums">
        {value}
      </p>
      {badge && <p className="mt-1.5 text-xs text-sousou-neutral">{badge}</p>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function DeltaBadge({ delta }: { delta: number }) {
  const sign = delta > 0 ? "+" : "";
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        delta > 0
          ? "bg-sousou-primary-50 text-sousou-primary-700"
          : delta < 0
            ? "bg-sousou-tertiary/10 text-sousou-tertiary"
            : "bg-muted text-sousou-neutral",
      )}
    >
      <Icon className="size-3" />
      {sign}
      {delta} %
    </span>
  );
}
