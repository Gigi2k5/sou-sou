"use client";

import { useState } from "react";

import { getInitials, resolveAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const sizeClasses = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-24 text-2xl",
  "2xl": "size-32 text-3xl",
} as const;

export type AvatarSize = keyof typeof sizeClasses;

/**
 * Avatar rond avec fallback initiales. Tient sur n'importe quel container —
 * la taille est contrôlée via la prop `size`, pas le parent.
 */
export function Avatar({
  avatarUrl,
  name,
  size = "md",
  className,
  bordered = false,
}: {
  avatarUrl: string | null | undefined;
  name: string;
  size?: AvatarSize;
  className?: string;
  bordered?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const url = resolveAvatarUrl(avatarUrl);
  const showImage = url && !errored;

  return (
    <span
      data-slot="avatar"
      className={cn(
        "inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none",
        "bg-gradient-to-br from-sousou-primary-50 to-sousou-primary-100 text-sousou-primary-700 font-semibold",
        sizeClasses[size],
        bordered && "ring-2 ring-sousou-primary ring-offset-2 ring-offset-background",
        className,
      )}
      aria-label={name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
          loading="lazy"
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </span>
  );
}
