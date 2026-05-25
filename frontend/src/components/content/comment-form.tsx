"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api";
import { createComment } from "@/lib/content-api";
import { cn } from "@/lib/utils";
import type { ArticleComment } from "@/types/content";

const MAX = 1000;

interface CommentFormProps {
  articleId: string;
  /** Avatar de l'utilisateur courant (pour l'aspect "input du forum"). */
  currentUser: { name: string; avatarUrl: string | null } | null;
  onCreated: (comment: ArticleComment) => void;
}

export function CommentForm({
  articleId,
  currentUser,
  onCreated,
}: CommentFormProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize du textarea selon le contenu (1 → ~6 lignes max).
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [body]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX) {
      toast.error(`Le commentaire ne peut pas dépasser ${MAX} caractères.`);
      return;
    }
    setSubmitting(true);
    try {
      const created = await createComment(articleId, trimmed);
      onCreated(created);
      setBody("");
      toast.success("Commentaire publié");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Publication impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!currentUser) {
    return (
      <p className="text-sm text-sousou-neutral italic">
        Connecte-toi pour ajouter un commentaire.
      </p>
    );
  }

  const remaining = MAX - body.length;
  const overLimit = remaining < 0;

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3">
      <Avatar
        avatarUrl={currentUser.avatarUrl}
        name={currentUser.name}
        size="sm"
        className="shrink-0 mt-1"
      />
      <div className="flex-1 min-w-0 space-y-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ton commentaire..."
          rows={1}
          maxLength={MAX + 200} // soft hint, vrai check côté validate
          className={cn(
            "w-full rounded-2xl border bg-card px-4 py-2.5 text-sm resize-none",
            "outline-none transition-colors",
            "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/30",
            "border-border/60",
            overLimit && "border-sousou-tertiary",
          )}
        />
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-xs tabular-nums",
              overLimit ? "text-sousou-tertiary" : "text-sousou-neutral/70",
            )}
          >
            {body.length > MAX - 100
              ? `${remaining} caractère${Math.abs(remaining) > 1 ? "s" : ""} restant${Math.abs(remaining) > 1 ? "s" : ""}`
              : ""}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim() || overLimit || submitting}
          >
            <Send className="size-3.5" />
            {submitting ? "Publication..." : "Publier"}
          </Button>
        </div>
      </div>
    </form>
  );
}
