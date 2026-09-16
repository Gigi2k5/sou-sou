"use client";

import { Check, Plus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Valeur sentinelle : bascule le sélecteur en saisie libre. */
const NEW = "__new__";

interface CategoryPickerProps {
  value: string | undefined;
  /** Noms proposés — catégories existantes de l'user + celles déjà utilisées ici. */
  options: string[];
  onChange: (name: string | undefined) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Choisit une catégorie parmi les existantes, ou en crée une à la volée.
 *
 * La création inline n'est pas un confort : sur un carnet réel, les catégories
 * qui manquent (« Loyer », « Loisirs ») sont justement celles qui concentrent
 * les plus gros montants. Obliger l'utilisateur à quitter l'écran pour les
 * créer, c'est le faire abandonner au milieu de sa relecture.
 */
export function CategoryPicker({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: CategoryPickerProps) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(
    () => [
      ...options.map((name) => ({ value: name, label: name })),
      { value: NEW, label: "➕ Nouvelle catégorie…" },
    ],
    [options],
  );

  function confirm() {
    const name = draft.trim();
    if (name) onChange(name.slice(0, 60));
    setCreating(false);
    setDraft("");
  }

  if (creating) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirm();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setCreating(false);
              setDraft("");
            }
          }}
          placeholder="Nom de la catégorie"
          maxLength={60}
          className="h-9 text-sm"
          aria-label="Nom de la nouvelle catégorie"
        />
        <button
          type="button"
          onClick={confirm}
          disabled={!draft.trim()}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sousou-primary-700 hover:bg-sousou-primary-50 disabled:opacity-40 dark:text-sousou-primary dark:hover:bg-sousou-primary/15"
          aria-label="Valider la catégorie"
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setCreating(false);
            setDraft("");
          }}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sousou-neutral hover:bg-muted"
          aria-label="Annuler"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <Select
      items={items}
      value={value ?? ""}
      onValueChange={(v) => {
        const next = String(v ?? "");
        if (next === NEW) {
          setCreating(true);
          return;
        }
        onChange(next || undefined);
      }}
    >
      <SelectTrigger className={cn("h-9 text-sm", className)} aria-label={ariaLabel}>
        <SelectValue placeholder="Sans catégorie" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.value === NEW ? (
              <span className="inline-flex items-center gap-1.5 text-sousou-primary-700 dark:text-sousou-primary">
                <Plus className="size-3.5" />
                Nouvelle catégorie…
              </span>
            ) : (
              item.label
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
