"use client";

import { motion } from "framer-motion";
import { Check, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteConfirmDialog } from "@/components/tracker/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface NamedItem {
  id: string;
  name: string;
}

export function NamedListManager<T extends NamedItem>({
  title,
  description,
  emptyText,
  items,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  accent = "primary",
  isLocked,
  lockedBadge,
}: {
  title: string;
  description: string;
  emptyText: string;
  items: T[];
  loading: boolean;
  onCreate: (name: string) => Promise<T>;
  onUpdate: (id: string, name: string) => Promise<T>;
  onDelete: (id: string) => Promise<void>;
  accent?: "primary" | "tertiary";
  /** Si renvoie true, l'item est en lecture seule (pas de rename / delete). */
  isLocked?: (item: T) => boolean;
  /** Texte du badge affiché à côté d'un item locked (ex: "Auto"). */
  lockedBadge?: (item: T) => string | undefined;
}) {
  const [creating, setCreating] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  const accentClasses = {
    primary: "bg-sousou-primary-50 text-sousou-primary-700",
    tertiary: "bg-sousou-tertiary/10 text-sousou-tertiary",
  } as const;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = creating.trim();
    if (!name) return;
    setSubmittingCreate(true);
    try {
      await onCreate(name);
      toast.success("Ajouté");
      setCreating("");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Création impossible"));
    } finally {
      setSubmittingCreate(false);
    }
  }

  async function handleUpdate(id: string) {
    const name = editingValue.trim();
    if (!name) return;
    try {
      await onUpdate(id, name);
      toast.success("Mis à jour");
      setEditingId(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Mise à jour impossible"));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      toast.success("Supprimé");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl text-sousou-secondary">{title}</h2>
        <p className="text-sm text-sousou-neutral">{description}</p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex gap-2"
      >
        <Input
          value={creating}
          onChange={(e) => setCreating(e.target.value)}
          placeholder="Nouveau nom..."
          maxLength={40}
        />
        <Button type="submit" disabled={!creating.trim() || submittingCreate}>
          <Plus className="size-4" />
          Ajouter
        </Button>
      </form>

      <div className="rounded-2xl border border-border/60 overflow-hidden">
        {loading ? (
          <div className="p-3 space-y-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-sousou-neutral">
            {emptyText}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item, i) => {
              const locked = isLocked?.(item) ?? false;
              const badge = lockedBadge?.(item);
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i, duration: 0.25 }}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <span
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center text-xs font-semibold",
                      accentClasses[accent],
                    )}
                  >
                    {item.name.slice(0, 1).toUpperCase()}
                  </span>

                  {editingId === item.id && !locked ? (
                    <>
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        autoFocus
                        maxLength={40}
                        className="h-9"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleUpdate(item.id);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleUpdate(item.id)}
                        aria-label="Valider"
                      >
                        <Check className="size-4 text-sousou-primary" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        aria-label="Annuler"
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-sousou-secondary truncate">
                        {item.name}
                      </span>
                      {locked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sousou-neutral">
                          <Lock className="size-3" />
                          {badge ?? "Auto"}
                        </span>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditingValue(item.name);
                            }}
                            aria-label="Renommer"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(item)}
                            className="hover:text-destructive"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Supprimer "${deleteTarget?.name}" ?`}
        description="Les transactions liées garderont leur historique mais perdront ce rattachement."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
