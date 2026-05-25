"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { MarkdownEditor } from "@/components/content/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api";
import { createArticle, updateArticle } from "@/lib/content-api";
import type { Article } from "@/types/content";

export function ArticleForm({
  initial,
  onSaved,
}: {
  initial?: Article | null;
  onSaved: (article: Article) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setContent(initial.content);
      setCoverImage(initial.coverImage ?? "");
    }
  }, [initial]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (title.trim().length < 5)
      e.title = "Titre trop court (5 caractères min)";
    if (title.trim().length > 180)
      e.title = "Titre trop long (180 caractères max)";
    if (content.trim().length < 20)
      e.content = "Contenu trop court (20 caractères min)";
    if (coverImage && !/^https?:\/\//.test(coverImage))
      e.coverImage = "URL invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        content,
        ...(coverImage.trim() ? { coverImage: coverImage.trim() } : {}),
      };
      const article = initial
        ? await updateArticle(initial.id, payload)
        : await createArticle(payload);
      toast.success(initial ? "Article mis à jour" : "Article publié");
      onSaved(article);
    } catch (err) {
      toast.error(
        extractApiErrorMessage(
          err,
          initial ? "Mise à jour impossible" : "Publication impossible",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="5 astuces pour épargner sans se priver"
          maxLength={180}
          className="mt-1.5 font-serif text-lg h-12"
          aria-invalid={!!errors.title || undefined}
        />
        <FieldError message={errors.title} />
      </div>

      <div>
        <Label htmlFor="cover">Image de couverture (URL, optionnel)</Label>
        <Input
          id="cover"
          type="url"
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://example.com/cover.jpg"
          className="mt-1.5"
          aria-invalid={!!errors.coverImage || undefined}
        />
        <FieldError message={errors.coverImage} />
      </div>

      <div>
        <Label htmlFor="content">Contenu</Label>
        <div className="mt-1.5">
          <MarkdownEditor
            id="content"
            value={content}
            onChange={setContent}
            rows={20}
          />
        </div>
        <FieldError message={errors.content} />
        <p className="text-xs text-sousou-neutral mt-2">
          Tu peux utiliser le markdown : <span className="font-mono">**gras**</span>,{" "}
          <span className="font-mono"># Titre</span>,{" "}
          <span className="font-mono">[lien](url)</span>, listes, citations...
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting
            ? "Publication..."
            : initial
              ? "Mettre à jour"
              : "Publier l'article"}
        </Button>
      </div>
    </form>
  );
}
