import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/",
  size = "md",
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: { wrap: "gap-2", img: 24, text: "text-base" },
    md: { wrap: "gap-2.5", img: 32, text: "text-xl" },
    lg: { wrap: "gap-3", img: 48, text: "text-2xl" },
  } as const;
  const s = sizes[size];

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center font-serif text-sousou-secondary",
        s.wrap,
        className,
      )}
    >
      <Image
        src="/mascot.png"
        alt=""
        width={s.img}
        height={s.img}
        className="drop-shadow-sm"
        priority
      />
      <span className={cn("font-semibold leading-none", s.text)}>
        Sou&apos;Sou
      </span>
    </Link>
  );
}
