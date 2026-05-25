"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ArticleForm } from "@/components/content/article-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getArticle } from "@/lib/content-api";
import { useAuth } from "@/providers/auth-provider";
import type { Article } from "@/types/content";

export default function EditArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    void (async () => {
      try {
        const a = await getArticle(slug);
        setArticle(a);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Redirect si pas autorisé à éditer
  useEffect(() => {
    if (loading || authLoading) return;
    if (!article) return;
    if (
      !user ||
      (user.role !== "ADMIN" && user.id !== article.author.id)
    ) {
      router.replace(`/blog/${article.slug}`);
    }
  }, [loading, authLoading, article, user, router]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-16">
        <h1 className="font-serif text-2xl text-sousou-secondary mb-2">
          Article introuvable
        </h1>
        <Link
          href="/blog"
          className="text-sousou-primary hover:underline text-sm"
        >
          Retour au blog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={`/blog/${article.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-sousou-neutral hover:text-sousou-secondary"
      >
        <ArrowLeft className="size-4" />
        Retour à l&apos;article
      </Link>

      <header>
        <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary">
          Modifier l&apos;article
        </h1>
        <p className="text-sm text-sousou-neutral mt-1">
          Les changements seront publiés immédiatement.
        </p>
      </header>

      <ArticleForm
        initial={article}
        onSaved={(updated) => router.push(`/blog/${updated.slug}`)}
      />
    </div>
  );
}
