"use client";

import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { MarkdownEditor } from "@/components/content/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api";
import { readFileAsDataUrl } from "@/lib/avatar";
import {
  createArticle,
  updateArticle,
  uploadArticleCover,
} from "@/lib/content-api";
import type { Article } from "@/types/content";

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      toast.error("Format non supporté. Utilise JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      toast.error(
        `Image trop lourde (${(file.size / 1_048_576).toFixed(1)} MB). Max 5 MB.`,
      );
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { url } = await uploadArticleCover(dataUrl);
      setCoverImage(url);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.coverImage;
        return next;
      });
      toast.success("Image uploadée");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Upload impossible"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        <Label htmlFor="cover">Image de couverture (optionnel)</Label>
        <div className="mt-1.5 flex flex-col sm:flex-row gap-2">
          <Input
            id="cover"
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://exemple.com/cover.jpg — ou upload"
            className="flex-1"
            aria-invalid={!!errors.coverImage || undefined}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="sm:w-auto"
          >
            <Upload className="size-4" />
            {uploading ? "Upload..." : "Uploader"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-sousou-neutral">
          Colle une URL, ou uploade un JPG / PNG / WEBP (5 MB max).
        </p>
        <FieldError message={errors.coverImage} />

        {coverImage && !uploading && (
          <div className="mt-3 relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt="Aperçu couverture"
              className="max-h-32 rounded-xl border border-border/60 object-cover"
              onError={() => {
                // Ne rien faire — le validate() attrape déjà les URLs invalides.
              }}
            />
            <button
              type="button"
              onClick={() => setCoverImage("")}
              className="absolute -top-2 -right-2 size-6 rounded-full bg-sousou-secondary text-white flex items-center justify-center shadow-md hover:bg-sousou-tertiary transition-colors"
              aria-label="Retirer l'image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
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
        <Button type="submit" size="lg" disabled={submitting || uploading}>
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
