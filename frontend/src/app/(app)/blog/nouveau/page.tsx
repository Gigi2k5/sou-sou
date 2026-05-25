"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArticleForm } from "@/components/content/article-form";

export default function NewArticlePage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-sousou-neutral hover:text-sousou-secondary"
      >
        <ArrowLeft className="size-4" />
        Tous les articles
      </Link>

      <header>
        <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary">
          Nouvel article
        </h1>
        <p className="text-sm text-sousou-neutral mt-1">
          L&apos;article sera publié immédiatement à la soumission.
        </p>
      </header>

      <ArticleForm
        onSaved={(a) => {
          router.push(`/blog/${a.slug}`);
        }}
      />
    </div>
  );
}
