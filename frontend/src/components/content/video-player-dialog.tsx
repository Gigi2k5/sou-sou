"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Resource } from "@/types/content";

/**
 * Lecteur vidéo : modale centrée sur desktop, plein écran (sheet) sur mobile.
 * Utilise les data-state du Dialog base-ui pour les transitions.
 */
export function VideoPlayerDialog({
  resource,
  onClose,
}: {
  resource: Resource | null;
  onClose: () => void;
}) {
  return (
    <DialogPrimitive.Root
      open={!!resource}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-sousou-secondary/70 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed z-50 outline-none",
            // mobile : full-screen sheet
            "inset-0 sm:inset-auto",
            // desktop : centered
            "sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:w-[min(96vw,960px)] sm:max-w-none",
            // shape
            "bg-sousou-secondary text-white sm:rounded-3xl overflow-hidden",
            "shadow-2xl shadow-sousou-secondary/40",
            "transition-all duration-250",
            // animations
            "data-[starting-style]:opacity-0",
            "sm:data-[starting-style]:scale-95",
            "max-sm:data-[starting-style]:translate-y-full",
            "data-[ending-style]:opacity-0",
            "sm:data-[ending-style]:scale-95",
            "max-sm:data-[ending-style]:translate-y-full",
            // layout flex pour mobile : header + iframe + meta
            "flex flex-col h-full sm:h-auto",
          )}
        >
          {resource && (
            <>
              <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-white/10">
                <div className="min-w-0">
                  <DialogPrimitive.Title className="font-serif text-lg sm:text-xl leading-tight line-clamp-2">
                    {resource.title}
                  </DialogPrimitive.Title>
                  <p className="text-xs text-white/60 mt-0.5 truncate">
                    {resource.channelName}
                  </p>
                </div>
                <DialogPrimitive.Close
                  className={cn(
                    "size-9 rounded-full shrink-0 inline-flex items-center justify-center",
                    "bg-white/10 hover:bg-white/20 text-white",
                    "transition-colors outline-none",
                    "focus-visible:ring-3 focus-visible:ring-white/30",
                  )}
                >
                  <X className="size-4" />
                  <span className="sr-only">Fermer</span>
                </DialogPrimitive.Close>
              </div>

              <div className="flex-1 sm:flex-initial bg-black flex items-center justify-center">
                <div className="w-full aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${resource.videoId}?autoplay=1&rel=0`}
                    title={resource.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>

              {resource.description && (
                <div className="p-4 sm:p-5 text-sm text-white/80 max-h-32 overflow-y-auto">
                  {resource.description}
                </div>
              )}
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
