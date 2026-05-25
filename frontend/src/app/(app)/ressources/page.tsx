"use client";

import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { CategoryPills } from "@/components/content/category-pills";
import { VideoCard } from "@/components/content/video-card";
import { VideoPlayerDialog } from "@/components/content/video-player-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { listResources } from "@/lib/content-api";
import type { Resource } from "@/types/content";

export default function RessourcesPage() {
  const [items, setItems] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [playing, setPlaying] = useState<Resource | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listResources(selectedCategory);
      setItems(data.items);
      setCategories(data.categories);
    } catch (err) {
      toast.error("Chargement impossible");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary inline-flex items-center gap-2">
          <GraduationCap className="size-7 text-sousou-primary" />
          Cours & Vidéos
        </h1>
        <p className="text-sm text-sousou-neutral mt-1">
          Une sélection d&apos;experts pour mieux comprendre l&apos;épargne et
          l&apos;investissement.
        </p>
      </header>

      {(categories.length > 0 || selectedCategory) && (
        <CategoryPills
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.04 } },
            hidden: {},
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {items.map((r, i) => (
            <VideoCard
              key={r.id}
              resource={r}
              onPlay={setPlaying}
              delay={0.04 * i}
            />
          ))}
        </motion.div>
      )}

      <VideoPlayerDialog resource={playing} onClose={() => setPlaying(null)} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-10 text-center">
      <div className="flex justify-center mb-4">
        <MascotAnimated mood="thinking" size="sm" disableConfetti />
      </div>
      <p className="text-sm text-sousou-neutral max-w-md mx-auto">
        Aucune vidéo dans cette catégorie pour l&apos;instant.
      </p>
    </div>
  );
}
