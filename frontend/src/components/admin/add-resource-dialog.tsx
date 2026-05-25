"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractApiErrorMessage } from "@/lib/api";
import { createAdminResource } from "@/lib/admin-resources-api";

const SUGGESTED_CATEGORIES = [
  "Investissement",
  "Épargne",
  "Budget",
  "Immobilier",
  "Mindset",
];

interface OembedPreview {
  videoId: string;
  thumbnail: string;
  title: string | null;
  author: string | null;
  loading: boolean;
}

export function AddResourceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localPreview = useMemo(() => previewFromUrl(url), [url]);
  const [oembed, setOembed] = useState<OembedPreview | null>(null);

  // Reset à l'ouverture
  useEffect(() => {
    if (open) {
      setUrl("");
      setCategory("");
      setDescription("");
      setError(null);
      setOembed(null);
    }
  }, [open]);

  // Live oEmbed lookup (debounced 400ms) dès qu'on a un videoId valide.
  useEffect(() => {
    if (!localPreview) {
      setOembed(null);
      return;
    }
    const videoId = localPreview.videoId;
    setOembed({
      videoId,
      thumbnail: localPreview.thumbnail,
      title: null,
      author: null,
      loading: true,
    });

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(
            `https://www.youtube.com/watch?v=${videoId}`,
          )}&format=json`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error("oEmbed indisponible");
        const data = (await res.json()) as {
          title?: string;
          author_name?: string;
        };
        setOembed({
          videoId,
          thumbnail: localPreview.thumbnail,
          title: data.title?.trim() ?? null,
          author: data.author_name?.trim() ?? null,
          loading: false,
        });
      } catch {
        setOembed({
          videoId,
          thumbnail: localPreview.thumbnail,
          title: null,
          author: null,
          loading: false,
        });
      }
    }, 400);

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [localPreview]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("URL YouTube requise.");
      return;
    }
    if (!localPreview) {
      setError("URL non reconnue (formats : watch, youtu.be, embed, shorts).");
      return;
    }
    setSubmitting(true);
    try {
      await createAdminResource({
        youtubeUrl: url.trim(),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success("Vidéo ajoutée");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Ajout impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une ressource YouTube</DialogTitle>
          <DialogDescription>
            Le titre et le nom de la chaîne sont récupérés automatiquement via
            l&apos;API publique YouTube.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="resource-url">URL YouTube</Label>
              <Input
                id="resource-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                aria-invalid={!!error || undefined}
                autoFocus
                className="mt-1.5"
              />
              <FieldError message={error ?? undefined} />
            </div>

            {oembed && (
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={oembed.thumbnail}
                  alt=""
                  className="w-28 aspect-video object-cover rounded-lg shrink-0"
                  loading="lazy"
                />
                <div className="text-xs min-w-0 flex-1">
                  {oembed.loading ? (
                    <p className="text-sousou-neutral italic">
                      Chargement de l&apos;aperçu...
                    </p>
                  ) : oembed.title ? (
                    <>
                      <p className="font-semibold text-sousou-secondary line-clamp-2">
                        {oembed.title}
                      </p>
                      {oembed.author && (
                        <p className="text-sousou-neutral mt-0.5">
                          {oembed.author}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sousou-neutral">
                      Aperçu indisponible — la vidéo sera quand même ajoutée si
                      l&apos;URL est valide.
                    </p>
                  )}
                  <p className="text-[10px] font-mono text-sousou-neutral mt-1 truncate">
                    {oembed.videoId}
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="resource-category">Catégorie (optionnel)</Label>
              <Input
                id="resource-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Investissement"
                list="resource-categories-suggest"
                maxLength={40}
                className="mt-1.5"
              />
              <datalist id="resource-categories-suggest">
                {SUGGESTED_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <Label htmlFor="resource-description">
                Description (optionnel)
              </Label>
              <Textarea
                id="resource-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={280}
                placeholder="Ex : Pour démarrer en 5 minutes."
                className="mt-1.5"
              />
              <p className="text-xs text-sousou-neutral mt-1.5">
                {description.length} / 280
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || !url.trim()}>
              <Plus className="size-4" />
              {submitting ? "Ajout..." : "Ajouter la vidéo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function previewFromUrl(
  input: string,
): { videoId: string; thumbnail: string } | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const idRe = /^[a-zA-Z0-9_-]{6,15}$/;
  let videoId: string | null = null;
  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com") {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else {
      const parts = url.pathname.split("/").filter(Boolean);
      if (
        parts.length >= 2 &&
        ["embed", "shorts", "v", "live"].includes(parts[0])
      ) {
        videoId = parts[1];
      }
    }
  }
  if (!videoId || !idRe.test(videoId)) return null;
  return {
    videoId,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}
