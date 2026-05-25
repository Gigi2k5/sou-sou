"use client";

import { motion } from "framer-motion";
import { Play, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Resource } from "@/types/content";

export function VideoCard({
  resource,
  onPlay,
  onDelete,
  delay = 0,
}: {
  resource: Resource;
  onPlay: (r: Resource) => void;
  onDelete?: (r: Resource) => void;
  delay?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const fallback = `https://img.youtube.com/vi/${resource.videoId}/hqdefault.jpg`;
  const src = imgError ? fallback : resource.thumbnailUrl;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="group relative rounded-3xl bg-card border border-border/60 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <button
        type="button"
        onClick={() => onPlay(resource)}
        className="block w-full text-left focus:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 rounded-3xl"
      >
        <div className="relative aspect-video bg-sousou-secondary/5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={resource.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          {/* Overlay play */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/0 transition-colors",
              "group-hover:bg-black/30",
            )}
          >
            <div
              className={cn(
                "size-14 rounded-full bg-white/90 text-sousou-tertiary flex items-center justify-center shadow-xl",
                "scale-90 opacity-80 group-hover:scale-100 group-hover:opacity-100 transition-all",
              )}
            >
              <Play className="size-7 fill-current translate-x-0.5" />
            </div>
          </div>
          {resource.category && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-sousou-primary/90 backdrop-blur text-white text-[10px] font-semibold uppercase tracking-wider">
              {resource.category}
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-medium text-sousou-secondary leading-snug mb-1.5 line-clamp-2">
            {resource.title}
          </h3>
          <p className="text-xs text-sousou-neutral truncate">
            {resource.channelName} · {formatDate(resource.createdAt)}
          </p>
        </div>
      </button>

      {onDelete && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(resource);
          }}
          aria-label="Supprimer"
          className="absolute top-3 right-3 bg-card/95 backdrop-blur shadow-sm hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </motion.article>
  );
}
