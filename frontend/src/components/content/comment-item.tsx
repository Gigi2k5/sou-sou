"use client";

import { motion } from "framer-motion";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AutoLinkText } from "@/components/content/auto-link-text";
import { DeleteConfirmDialog } from "@/components/tracker/delete-confirm-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api";
import { deleteComment, updateComment } from "@/lib/content-api";
import { formatDateRelative } from "@/lib/format";
import type { ArticleComment } from "@/types/content";
import type { AuthUser } from "@/lib/auth-schemas";

const MAX = 1000;

interface CommentItemProps {
  comment: ArticleComment;
  currentUser: AuthUser | null;
  onUpdated: (comment: ArticleComment) => void;
  onDeleted: (commentId: string) => void;
}

export function CommentItem({
  comment,
  currentUser,
  onUpdated,
  onDeleted,
}: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAuthor = currentUser?.id === comment.author.id;
  const isAdmin = currentUser?.role === "ADMIN";
  const canEdit = isAuthor && !comment.isHidden;
  const canDelete = isAuthor || isAdmin;

  function startEdit() {
    setDraft(comment.body);
    setEditing(true);
    // Focus + place le curseur en fin de texte au prochain frame.
    setTimeout(() => {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }, 0);
  }

  async function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Le commentaire ne peut pas être vide.");
      return;
    }
    if (trimmed.length > MAX) {
      toast.error(`Le commentaire ne peut pas dépasser ${MAX} caractères.`);
      return;
    }
    if (trimmed === comment.body) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateComment(comment.id, trimmed);
      onUpdated(updated);
      setEditing(false);
      toast.success("Commentaire modifié");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Modification impossible"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteComment(comment.id);
      onDeleted(comment.id);
      toast.success("Commentaire supprimé");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
      setDeleting(false);
    }
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3"
    >
      <Avatar
        avatarUrl={comment.author.avatarUrl}
        name={comment.author.name}
        size="sm"
        className="shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border border-border/60 bg-card px-4 py-2.5">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-sm font-semibold text-sousou-secondary truncate">
              {comment.author.name}
            </span>
            <span className="text-[11px] text-sousou-neutral shrink-0 tabular-nums">
              {formatDateRelative(comment.createdAt)}
              {comment.updatedAt !== comment.createdAt && (
                <span className="ml-1 italic">· modifié</span>
              )}
            </span>
          </div>

          {comment.isHidden && !isAdmin ? (
            <p className="text-sm italic text-sousou-neutral">
              Commentaire masqué par la modération.
            </p>
          ) : editing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/30 resize-y"
              />
              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  <X className="size-3.5" />
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={saveEdit}
                  disabled={saving}
                >
                  <Check className="size-3.5" />
                  {saving ? "..." : "Enregistrer"}
                </Button>
              </div>
            </div>
          ) : (
            <AutoLinkText
              text={comment.body}
              className="text-sm text-sousou-secondary leading-relaxed"
            />
          )}

          {comment.isHidden && isAdmin && (
            <p className="mt-1 text-[11px] italic text-sousou-tertiary">
              Masqué par la modération.
            </p>
          )}
        </div>

        {!editing && (canEdit || canDelete) && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {canEdit && (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sousou-neutral hover:bg-muted hover:text-sousou-secondary transition-colors"
              >
                <Pencil className="size-3" />
                Modifier
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sousou-neutral hover:bg-muted hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3" />
                Supprimer
              </button>
            )}
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => !o && setDeleteOpen(false)}
        title="Supprimer ce commentaire ?"
        description="Cette action est irréversible."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </motion.li>
  );
}
