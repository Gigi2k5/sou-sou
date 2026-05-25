"use client";

import { Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Affiche le code d'invitation d'une cotisation groupe en grand,
 * avec actions Copier + Partager (Web Share API si dispo, sinon
 * fallback clipboard).
 */
export function ShareMoneyPotCode({
  code,
  potName,
  className,
}: {
  code: string;
  potName: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copie impossible");
    }
  }

  async function handleShare() {
    const text = `Rejoins « ${potName} » sur Sou'Sou avec le code ${code}.`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Sou'Sou — ${potName}`,
          text,
        });
        return;
      } catch {
        /* user cancelled — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copié");
    } catch {
      toast.error("Partage indisponible");
    }
  }

  return (
    <div
      className={cn(
        "rounded-3xl border border-border/60 bg-gradient-to-br from-sousou-primary-50 via-card to-card p-5",
        className,
      )}
    >
      <p className="text-xs uppercase tracking-widest text-sousou-neutral font-semibold">
        Code d&apos;invitation
      </p>
      <p className="font-mono text-3xl sm:text-4xl font-bold text-sousou-secondary tracking-[0.3em] mt-2 mb-1">
        {code}
      </p>
      <p className="text-xs text-sousou-neutral mb-4">
        6 caractères, sans I / O / 0 / 1 (anti-confusion).
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          className="sm:flex-1"
        >
          <Copy className="size-4" />
          {copied ? "Copié !" : "Copier le code"}
        </Button>
        <Button
          type="button"
          onClick={handleShare}
          className="sm:flex-1"
        >
          <Share2 className="size-4" />
          Partager
        </Button>
      </div>
    </div>
  );
}
