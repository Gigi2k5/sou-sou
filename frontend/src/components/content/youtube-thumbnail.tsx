"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Miniature YouTube avec fallback automatique.
 *
 * Le backend retourne par défaut `maxresdefault.jpg` (HD), qui n'existe que
 * pour ~30% des vidéos. Quand l'image 404 ou renvoie un placeholder gris,
 * on bascule sur `hqdefault.jpg` qui existe pour 100% des vidéos.
 *
 * À utiliser partout où on affiche un thumbnail YouTube côté front.
 */
export function YoutubeThumbnail({
  videoId,
  thumbnailUrl,
  alt = "",
  className,
}: {
  videoId: string;
  thumbnailUrl: string;
  alt?: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const fallback = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const src = errored ? fallback : thumbnailUrl;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={cn("object-cover", className)}
      loading="lazy"
    />
  );
}
