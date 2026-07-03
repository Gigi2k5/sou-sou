import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-sousou-neutral/10 dark:bg-sousou-neutral/25",
        className,
      )}
      {...props}
    />
  );
}
