"use client";

import { Eye, Pencil, Split } from "lucide-react";
import { useState } from "react";

import { MarkdownView } from "@/components/content/markdown-view";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Mode = "edit" | "preview" | "split";

/**
 * Éditeur markdown avec preview live.
 * - Mobile : toggle edit ↔ preview (split occupe trop d'espace).
 * - Desktop : possible split côte à côte.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder = "# Titre\n\nÉcris ici en **markdown**...",
  rows = 16,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
}) {
  const [mode, setMode] = useState<Mode>("edit");

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-muted/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-sousou-neutral">
          Markdown
        </span>
        <div className="inline-flex items-center gap-1 rounded-xl bg-card p-0.5 border border-border/60 text-sm">
          <ModeButton
            label="Éditer"
            icon={<Pencil className="size-3.5" />}
            active={mode === "edit"}
            onClick={() => setMode("edit")}
          />
          <ModeButton
            label="Côte à côte"
            icon={<Split className="size-3.5" />}
            active={mode === "split"}
            onClick={() => setMode("split")}
            desktopOnly
          />
          <ModeButton
            label="Aperçu"
            icon={<Eye className="size-3.5" />}
            active={mode === "preview"}
            onClick={() => setMode("preview")}
          />
        </div>
      </div>

      <div
        className={cn(
          mode === "split"
            ? "grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-border/60"
            : "block",
        )}
      >
        {(mode === "edit" || mode === "split") && (
          <Textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="border-0 rounded-none resize-y font-mono text-[13px] leading-relaxed"
          />
        )}
        {(mode === "preview" || mode === "split") && (
          <div className="p-5 min-h-[200px] max-h-[600px] overflow-y-auto">
            {value.trim() ? (
              <MarkdownView content={value} />
            ) : (
              <p className="text-sm text-sousou-neutral italic">
                L&apos;aperçu apparaîtra ici.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({
  label,
  icon,
  active,
  onClick,
  desktopOnly,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  desktopOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
        active
          ? "bg-sousou-primary-50 text-sousou-primary-700"
          : "text-sousou-neutral hover:text-sousou-secondary hover:bg-muted",
        desktopOnly && "hidden lg:inline-flex",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
