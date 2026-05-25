"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star, Trash2 } from "lucide-react";

import { YoutubeThumbnail } from "@/components/content/youtube-thumbnail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdminResource } from "@/types/admin-resources";

export function SortableResourceRow({
  resource,
  onToggleFeatured,
  onDelete,
  busy,
}: {
  resource: AdminResource;
  onToggleFeatured: (r: AdminResource) => void;
  onDelete: (r: AdminResource) => void;
  busy?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: resource.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-stretch gap-2 sm:gap-3 rounded-2xl border bg-card p-2 sm:p-3",
        resource.isFeatured
          ? "border-sousou-primary/40 bg-sousou-primary-50/40"
          : "border-border/60",
        isDragging && "shadow-lg ring-2 ring-sousou-primary/40 z-10",
        busy && "opacity-60",
      )}
    >
      {/* Handle drag */}
      <button
        type="button"
        aria-label="Réordonner"
        className="shrink-0 self-stretch flex items-center px-1 text-sousou-neutral hover:text-sousou-secondary cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>

      {/* Thumb + meta */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <YoutubeThumbnail
          videoId={resource.videoId}
          thumbnailUrl={resource.thumbnailUrl}
          className="w-24 sm:w-32 aspect-video rounded-lg shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <h3 className="text-sm font-semibold text-sousou-secondary line-clamp-2">
              {resource.title}
            </h3>
            {resource.isFeatured && (
              <Star className="size-3.5 text-sousou-primary shrink-0 mt-0.5 fill-sousou-primary" />
            )}
          </div>
          <p className="text-xs text-sousou-neutral mt-0.5 truncate">
            {resource.channelName}
          </p>
          {resource.category && (
            <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide bg-muted text-sousou-neutral rounded-full px-2 py-0.5">
              {resource.category}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onToggleFeatured(resource)}
          disabled={busy}
          aria-label={
            resource.isFeatured ? "Retirer de la une" : "Mettre en avant"
          }
          className={cn(
            resource.isFeatured
              ? "text-sousou-primary hover:text-sousou-primary"
              : "hover:text-sousou-primary",
          )}
        >
          <Star
            className={cn(
              "size-4",
              resource.isFeatured && "fill-sousou-primary",
            )}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(resource)}
          disabled={busy}
          aria-label="Supprimer"
          className="hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}
