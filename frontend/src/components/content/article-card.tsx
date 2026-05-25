"use client";

import { motion } from "framer-motion";
import { Calendar, Heart, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ArticleListItem } from "@/types/content";

export function ArticleCard({
  article,
  delay = 0,
}: {
  article: ArticleListItem;
  delay?: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="group rounded-3xl bg-card border border-border/60 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <Link
        href={`/blog/${article.slug}`}
        className="block focus:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 rounded-3xl"
      >
        {article.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImage}
            alt=""
            className="w-full aspect-[16/9] object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[16/9] bg-gradient-to-br from-sousou-primary-50 via-card to-sousou-tertiary/10 flex items-center justify-center">
            <span className="font-serif text-3xl text-sousou-primary/40 select-none">
              Sou&apos;Sou
            </span>
          </div>
        )}

        <div className="p-5">
          <h3 className="font-serif text-xl text-sousou-secondary leading-tight mb-2 line-clamp-2 group-hover:text-sousou-primary-700 transition-colors">
            {article.title}
          </h3>
          <p className="text-sm text-sousou-neutral leading-relaxed line-clamp-3 mb-4">
            {article.excerpt}
          </p>
          <div className="flex items-center gap-2 text-xs text-sousou-neutral">
            <Avatar
              avatarUrl={article.author.avatarUrl}
              name={article.author.name}
              size="xs"
            />
            <span className="font-semibold text-sousou-secondary truncate">
              {article.author.name}
            </span>
            <span className="inline-flex items-center gap-1 ml-auto shrink-0">
              <Calendar className="size-3" />
              {formatDate(article.createdAt)}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-3 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 tabular-nums",
                article.likedByMe
                  ? "text-sousou-tertiary"
                  : "text-sousou-neutral",
              )}
              aria-label={`${article.likeCount} like${article.likeCount > 1 ? "s" : ""}`}
            >
              <Heart
                className={cn(
                  "size-3.5",
                  article.likedByMe && "fill-current",
                )}
              />
              {article.likeCount}
            </span>
            <span
              className="inline-flex items-center gap-1 text-sousou-neutral tabular-nums"
              aria-label={`${article.commentCount} commentaire${article.commentCount > 1 ? "s" : ""}`}
            >
              <MessageCircle className="size-3.5" />
              {article.commentCount}
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
