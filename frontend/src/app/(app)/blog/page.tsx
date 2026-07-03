"use client";

import { motion } from "framer-motion";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { ArticleCard } from "@/components/content/article-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listArticles } from "@/lib/content-api";
import type { ArticlesList } from "@/types/content";

export default function BlogPage() {
  const [data, setData] = useState<ArticlesList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await listArticles({ limit: 24 });
        setData(res);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary inline-flex items-center gap-2">
            <BookOpen className="size-7 text-sousou-primary" />
            Blog
          </h1>
          <p className="text-sm text-sousou-neutral mt-1">
            Astuces d&apos;épargne et témoignages — partage les tiens.
          </p>
        </div>
        <Button
          size="lg"
          nativeButton={false}
          render={
            <Link href="/blog/nouveau">
              <Plus className="size-4" />
              Écrire un article
            </Link>
          }
        />
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-3xl" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyBlog />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.04 } },
            hidden: {},
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {data.items.map((article, i) => (
            <ArticleCard key={article.id} article={article} delay={0.04 * i} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function EmptyBlog() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-sousou-primary-50 via-card to-card dark:from-sousou-primary/10 dark:via-card dark:to-card border border-border/60 p-10 text-center">
      <div className="flex justify-center mb-4">
        <MascotAnimated mood="thinking" size="md" interactive disableConfetti />
      </div>
      <h2 className="font-serif text-2xl text-sousou-secondary mb-2">
        Pas encore d&apos;articles
      </h2>
      <p className="text-sm text-sousou-neutral mb-5 max-w-md mx-auto">
        Sois le premier à partager une astuce ou un retour d&apos;expérience.
      </p>
      <Button
        size="lg"
        nativeButton={false}
        render={
          <Link href="/blog/nouveau">
            <Plus className="size-4" />
            Écrire le premier article
          </Link>
        }
      />
    </div>
  );
}
