"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Rendu markdown stylé avec la palette Sou'Sou.
 * Pas de raw HTML autorisé (par défaut react-markdown), donc safe by design.
 */
export function MarkdownView({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose-sousou max-w-none",
        // typographie
        "[&>h1]:font-serif [&>h1]:text-3xl [&>h1]:text-sousou-secondary [&>h1]:mt-8 [&>h1]:mb-3 [&>h1]:leading-tight",
        "[&>h2]:font-serif [&>h2]:text-2xl [&>h2]:text-sousou-secondary [&>h2]:mt-7 [&>h2]:mb-2",
        "[&>h3]:font-serif [&>h3]:text-xl [&>h3]:text-sousou-secondary [&>h3]:mt-5 [&>h3]:mb-2",
        "[&>p]:text-base [&>p]:text-sousou-secondary/90 [&>p]:leading-relaxed [&>p]:my-4",
        "[&>ul]:my-4 [&>ul]:pl-5 [&>ul]:space-y-1 [&>ul]:list-disc [&>ul]:marker:text-sousou-primary",
        "[&>ol]:my-4 [&>ol]:pl-5 [&>ol]:space-y-1 [&>ol]:list-decimal [&>ol]:marker:text-sousou-neutral",
        "[&>ul>li]:text-sousou-secondary/90 [&>ol>li]:text-sousou-secondary/90",
        "[&_a]:text-sousou-primary-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-sousou-primary",
        "[&>blockquote]:border-l-4 [&>blockquote]:border-sousou-primary [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-sousou-neutral [&>blockquote]:my-5",
        "[&_code]:bg-muted [&_code]:rounded-md [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_code]:text-sousou-secondary",
        "[&>pre]:bg-sousou-secondary [&>pre]:text-white [&>pre]:rounded-2xl [&>pre]:p-4 [&>pre]:my-5 [&>pre]:overflow-x-auto",
        "[&>pre_code]:bg-transparent [&>pre_code]:text-white [&>pre_code]:px-0",
        "[&>hr]:border-border [&>hr]:my-8",
        "[&>table]:w-full [&>table]:my-5 [&>table]:border-collapse",
        "[&>table_th]:text-left [&>table_th]:font-semibold [&>table_th]:p-2 [&>table_th]:border-b [&>table_th]:border-border",
        "[&>table_td]:p-2 [&>table_td]:border-b [&>table_td]:border-border/50",
        "[&_img]:rounded-2xl [&_img]:my-5",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
