"use client";

import { motion } from "framer-motion";
import { ClipboardPaste, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FileDrop } from "@/components/import/file-drop";
import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const MAX_IMPORT_CHARS = 60_000;

/**
 * L'analyse traverse un modèle de langage : 30 à 60 s sur un mois de notes.
 * Un simple spinner sur cette durée passe pour un plantage, donc on raconte ce
 * qui se passe. Les étapes sont indicatives et volontairement honnêtes — on
 * n'invente pas une barre de progression dont on ne connaît pas l'avancement.
 */
const STAGES = [
  "Lecture de tes notes…",
  "Repérage des dates et des montants…",
  "Séparation des vraies lignes et des totaux…",
  "Rangement par catégorie…",
  "Vérification des additions…",
  "Encore quelques secondes…",
];

interface PasteStepProps {
  loading: boolean;
  /** Un fichier est en cours de lecture dans le navigateur. */
  readingFile: boolean;
  /**
   * Le texte est piloté par le parent : quand un fichier bascule vers
   * l'analyse, c'est lui qui vient remplir cette zone. L'utilisateur voit alors
   * exactement ce qui partira, et peut le corriger — ce qu'un envoi direct du
   * fichier lui interdirait.
   */
  text: string;
  onTextChange: (next: string) => void;
  onAnalyze: (text: string) => void;
  onFile: (file: File) => void;
}

export function PasteStep({
  loading,
  readingFile,
  text,
  onTextChange,
  onAnalyze,
  onFile,
}: PasteStepProps) {
  const [stage, setStage] = useState(0);
  const stageRef = useRef(0);

  useEffect(() => {
    if (!loading) return;
    stageRef.current = 0;
    const id = setInterval(() => {
      stageRef.current = Math.min(stageRef.current + 1, STAGES.length - 1);
      setStage(stageRef.current);
    }, 9_000);
    return () => clearInterval(id);
  }, [loading]);

  const tooLong = text.length > MAX_IMPORT_CHARS;
  const tooShort = text.trim().length < 10;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <MascotAnimated mood="thinking" size="lg" disableConfetti />
        <div>
          <p className="mb-1 inline-flex items-center gap-2 font-serif text-xl text-sousou-secondary">
            <Loader2 className="size-4 animate-spin text-sousou-primary" />
            {STAGES[stage]}
          </p>
          <p className="text-sm text-sousou-neutral">
            Ça prend en général moins d&apos;une minute. Ne ferme pas la page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <FileDrop busy={readingFile} onFile={onFile} />

      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-sousou-neutral">
          ou colle
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
        <label
          htmlFor="import-text"
          className="mb-2 flex items-center gap-2 font-serif text-lg text-sousou-secondary"
        >
          <ClipboardPaste className="size-4 text-sousou-primary" />
          Colle tes notes
        </label>
        <p className="mb-4 text-sm text-sousou-neutral">
          Peu importe la forme : un carnet de téléphone, un tableau Excel copié,
          des messages que tu t&apos;envoies. Un mois à la fois, c&apos;est le
          plus sûr.
        </p>

        <Textarea
          id="import-text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={14}
          placeholder={
            "Samedi 01/08/2026\nZem = 1000\nRiz = 1350\nTotal = 2350\n\nDimanche 02/08/2026\n…"
          }
          className="font-mono text-sm"
          aria-describedby="import-counter"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <p
            id="import-counter"
            className={cn(
              "text-xs tabular-nums",
              tooLong ? "font-semibold text-rose-600" : "text-sousou-neutral",
            )}
          >
            {text.length.toLocaleString("fr-FR")} /{" "}
            {MAX_IMPORT_CHARS.toLocaleString("fr-FR")} caractères
          </p>
          <Button
            type="button"
            onClick={() => onAnalyze(text)}
            disabled={tooShort || tooLong}
          >
            <Sparkles className="size-4" />
            Analyser
          </Button>
        </div>

        {tooLong && (
          <p className="mt-2 text-xs text-rose-600">
            C&apos;est trop long pour une seule fois. Découpe par mois et
            recommence — tu pourras importer chaque mois l&apos;un après
            l&apos;autre.
          </p>
        )}
      </div>

      <p className="px-1 text-xs leading-relaxed text-sousou-neutral">
        Tes notes sont envoyées à un service d&apos;analyse pour être
        transformées en transactions. Rien n&apos;est enregistré dans ton compte
        avant que tu aies relu et validé.
      </p>
    </motion.div>
  );
}
