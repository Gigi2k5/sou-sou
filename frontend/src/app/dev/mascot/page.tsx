"use client";

import { Check, ClipboardCopy, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  MascotAnimated,
  type MascotMood,
  type MascotSize,
} from "@/components/mascot/mascot-animated";
import {
  MascotBubble,
  type BubbleSize,
} from "@/components/mascot/mascot-bubble";
import { Button } from "@/components/ui/button";
import {
  MASCOT_LAYERS,
  type LayerKey,
  type LayerPosition,
} from "@/lib/mascot-layers";

const ALL_MOODS: MascotMood[] = [
  "idle",
  "happy",
  "celebrating",
  "warning",
  "encouraging",
  "thinking",
  "sleeping",
  "sad",
  "flying",
];

const LAYER_LABELS: Record<LayerKey, string> = {
  wings: "Ailes",
  body: "Corps",
  armRight: "Bras droit",
  armLeft: "Bras gauche",
  eyes: "Yeux (open + closed)",
  mouth: "Bouche",
  coin: "Pièce",
  sparkle: "Sparkle",
};

/** Échantillons de messages pour preview de chaque mood dans la bulle. */
const SAMPLE_MESSAGES: Record<MascotMood, { message: string; emoji?: string }> = {
  idle: { message: "Petit à petit, l'oiseau fait son nid", emoji: "🪺" },
  happy: { message: "7 jours d'affilée ! Tu es une machine, continue comme ça !", emoji: "🔥" },
  celebrating: { message: "Tu y es presque ! Plus que 5 000 FCFA pour atteindre ton objectif." },
  warning: { message: "Hé, n'oublie pas ta cotisation du jour ! Ton futur toi te remerciera." },
  encouraging: { message: "Pas grave pour hier, on reprend aujourd'hui ! Un nouveau streak commence maintenant." },
  thinking: { message: "Hum… N'oublie pas de noter tes transactions pour bien suivre ton budget !" },
  sleeping: { message: "Tu m'as manqué… On reprend où on s'était arrêté ?" },
  sad: { message: "Pas grave, on se relève toujours." },
  flying: { message: "OBJECTIF ATTEINT ! Tu es incroyable, savoure cette victoire !", emoji: "🏆" },
};

const FIELDS: { key: keyof LayerPosition; label: string; min: number; max: number }[] = [
  { key: "top", label: "top", min: -50, max: 150 },
  { key: "left", label: "left", min: -50, max: 150 },
  { key: "right", label: "right", min: -50, max: 150 },
  { key: "bottom", label: "bottom", min: -50, max: 150 },
  { key: "width", label: "width", min: 5, max: 150 },
  { key: "translateX", label: "translateX", min: -100, max: 100 },
  { key: "translateY", label: "translateY", min: -100, max: 100 },
];

export default function MascotDevPage() {
  const [layers, setLayers] = useState(MASCOT_LAYERS);
  const [mainMood, setMainMood] = useState<MascotMood>("idle");
  const [mainSize, setMainSize] = useState<MascotSize>("xl");
  const [showGuides, setShowGuides] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(true);
  const [interactive, setInteractive] = useState(true);
  const [bubbleSize, setBubbleSize] = useState<BubbleSize>("md");
  const [bubblePosition, setBubblePosition] = useState<"left" | "right">(
    "left",
  );

  function updateLayer(
    key: LayerKey,
    field: keyof LayerPosition,
    value: number | undefined,
  ) {
    setLayers((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function resetLayers() {
    setLayers(MASCOT_LAYERS);
    toast.success("Positions remises à zéro");
  }

  async function copyJson() {
    const json = JSON.stringify(layers, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      toast.success("JSON copié — colle-le dans lib/mascot-layers.ts");
    } catch {
      toast.error("Copie impossible");
    }
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border/60 bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl text-sousou-secondary">
              🎬 Mascot Lab
            </h1>
            <p className="text-xs text-sousou-neutral">
              Page de dev — calage des couches + preview des moods.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuides((v) => !v)}
            >
              {showGuides ? <Check className="size-4" /> : null}
              Guides
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInteractive((v) => !v)}
            >
              {interactive ? <Check className="size-4" /> : null}
              Interactif
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustOpen((v) => !v)}
            >
              <SlidersHorizontal className="size-4" />
              {adjustOpen ? "Masquer ajustements" : "Mode ajustement"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Colonne principale : preview centrale + grille tous les moods */}
        <div className="space-y-8">
          <section className="rounded-3xl border border-border/60 bg-card p-6">
            <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-serif text-xl text-sousou-secondary">
                  Preview principal
                </h2>
                <p className="text-xs text-sousou-neutral">
                  Mood : <strong>{mainMood}</strong>
                  {interactive && (
                    <span className="ml-2 text-emerald-700">
                      · clique sur la mascotte pour la chatouiller
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={mainSize}
                  onChange={(e) => setMainSize(e.target.value as MascotSize)}
                  className="rounded-xl border border-border/60 bg-card px-3 py-1.5 text-sm"
                >
                  <option value="sm">sm (80px)</option>
                  <option value="md">md (120px)</option>
                  <option value="lg">lg (200px)</option>
                  <option value="xl">xl (300px)</option>
                </select>
                <select
                  value={mainMood}
                  onChange={(e) => setMainMood(e.target.value as MascotMood)}
                  className="rounded-xl border border-border/60 bg-card px-3 py-1.5 text-sm"
                >
                  {ALL_MOODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </header>
            <div className="flex justify-center py-6">
              <div className="relative">
                {showGuides && <Guides />}
                <MascotAnimated
                  mood={mainMood}
                  size={mainSize}
                  interactive={interactive}
                  layersOverride={layers}
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-6">
            <h2 className="font-serif text-xl text-sousou-secondary mb-3">
              Tous les moods
            </h2>
            <p className="text-xs text-sousou-neutral mb-5">
              Toutes les animations sont actives. Sur la grille, les
              confettis plein écran sont désactivés pour ne pas spammer
              l&apos;écran (le mood{" "}
              <span className="font-mono">celebrating</span> en lance un en
              prod).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
              {ALL_MOODS.map((m) => (
                <div
                  key={m}
                  className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col items-center text-center"
                >
                  <MascotAnimated
                    mood={m}
                    size="md"
                    layersOverride={layers}
                    disableConfetti
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-sousou-secondary mt-2">
                    {m}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-6">
            <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-serif text-xl text-sousou-secondary">
                  Bulles de dialogue
                </h2>
                <p className="text-xs text-sousou-neutral">
                  Mascotte + bulle avec queue, animation séquentielle
                  (mascotte d&apos;abord, bulle 300 ms après).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bubbleSize}
                  onChange={(e) => setBubbleSize(e.target.value as BubbleSize)}
                  className="rounded-xl border border-border/60 bg-card px-3 py-1.5 text-sm"
                >
                  <option value="sm">sm</option>
                  <option value="md">md</option>
                  <option value="lg">lg</option>
                </select>
                <select
                  value={bubblePosition}
                  onChange={(e) =>
                    setBubblePosition(e.target.value as "left" | "right")
                  }
                  className="rounded-xl border border-border/60 bg-card px-3 py-1.5 text-sm"
                >
                  <option value="left">Mascotte à gauche</option>
                  <option value="right">Mascotte à droite</option>
                </select>
              </div>
            </header>

            <ul className="space-y-4">
              {ALL_MOODS.map((m) => (
                <li
                  key={`bubble-${m}`}
                  className="flex items-start gap-3 border-t border-border/60 pt-4 first:border-t-0 first:pt-0"
                >
                  <span className="font-mono text-[11px] text-sousou-neutral w-20 shrink-0 pt-2">
                    {m}
                  </span>
                  <div className="flex-1 min-w-0">
                    <MascotBubble
                      key={`${m}-${bubbleSize}-${bubblePosition}`}
                      mood={m}
                      size={bubbleSize}
                      position={bubblePosition}
                      message={SAMPLE_MESSAGES[m].message}
                      emoji={SAMPLE_MESSAGES[m].emoji}
                      disableConfetti
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sidebar : ajustements par layer */}
        {adjustOpen && (
          <aside className="rounded-3xl border border-border/60 bg-card p-5 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <header className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-serif text-lg text-sousou-secondary">
                Calage des couches
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Reset"
                  onClick={resetLayers}
                >
                  <RotateCcw className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyJson}
                >
                  <ClipboardCopy className="size-4" />
                  Copier JSON
                </Button>
              </div>
            </header>

            <p className="text-[11px] text-sousou-neutral mb-4">
              Ajuste en %, copie le JSON, et colle-le dans{" "}
              <span className="font-mono">lib/mascot-layers.ts</span>.
            </p>

            <div className="space-y-4">
              {(Object.keys(layers) as LayerKey[]).map((key) => (
                <LayerEditor
                  key={key}
                  layerKey={key}
                  position={layers[key]}
                  onChange={(field, value) => updateLayer(key, field, value)}
                />
              ))}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

function LayerEditor({
  layerKey,
  position,
  onChange,
}: {
  layerKey: LayerKey;
  position: LayerPosition;
  onChange: (field: keyof LayerPosition, value: number | undefined) => void;
}) {
  return (
    <details className="rounded-xl border border-border/60 bg-card open:bg-muted/20" open>
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-sousou-secondary">
        {LAYER_LABELS[layerKey]}
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-2">
        {FIELDS.map((f) => {
          const value = position[f.key];
          return (
            <div key={f.key} className="flex items-center gap-2">
              <label className="font-mono text-[11px] text-sousou-neutral w-20 shrink-0">
                {f.label}
              </label>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={1}
                value={value ?? 0}
                onChange={(e) => onChange(f.key, Number(e.target.value))}
                className="flex-1 accent-sousou-primary"
                disabled={value === undefined}
              />
              <input
                type="number"
                step={1}
                value={value ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value;
                  onChange(f.key, v === "" ? undefined : Number(v));
                }}
                className="w-16 rounded-md border border-border/60 bg-card px-2 py-1 text-xs tabular-nums"
              />
            </div>
          );
        })}
      </div>
    </details>
  );
}

/**
 * Guides visuels : croix de centre + grille au 25%/50%/75% pour aider
 * à caler les pièces. Activable via le bouton "Guides".
 */
function Guides() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Croix de centre */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-rose-400/40" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-rose-400/40" />
      {/* Grille 25 / 75 */}
      {[25, 75].map((p) => (
        <div
          key={`v-${p}`}
          className="absolute top-0 bottom-0 w-px bg-emerald-400/30"
          style={{ left: `${p}%` }}
        />
      ))}
      {[25, 75].map((p) => (
        <div
          key={`h-${p}`}
          className="absolute left-0 right-0 h-px bg-emerald-400/30"
          style={{ top: `${p}%` }}
        />
      ))}
    </div>
  );
}
