"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { MascotAnimated, type MascotMood } from "@/components/mascot/mascot-animated";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StepShellProps {
  /** Mood de la mascotte pour cette step. */
  mood: MascotMood;
  title: ReactNode;
  /** Sous-titre court — peut contenir des spans pour styler. */
  subtitle?: ReactNode;
  /** Contenu principal de la step (illustration ou form). */
  children?: ReactNode;
  /** Texte du bouton primaire (par défaut "Suivant"). */
  primaryLabel?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary: () => void | Promise<void>;
  /** Si défini → bouton secondaire à gauche (Précédent). */
  onPrevious?: () => void;
  /** Layout : "centered" (text + mascot column) ou "split" (illustration côté). */
  layout?: "centered" | "split";
  /** Optionnel : la mascotte se reflète à droite si split. */
  splitContent?: ReactNode;
}

export function StepShell({
  mood,
  title,
  subtitle,
  children,
  primaryLabel = "Suivant",
  primaryDisabled,
  primaryLoading,
  onPrimary,
  onPrevious,
  layout = "centered",
  splitContent,
}: StepShellProps) {
  return (
    // `min-h-0` est indispensable : sans lui, un enfant `flex-1` refuse de
    // rétrécir sous la taille de son contenu et pousse le footer hors de la
    // boîte, où les `overflow-hidden` parents le découpent. C'était la cause
    // de l'écran bloqué sur « Étape 1 sur 5 » sans aucun bouton atteignable.
    <div className="flex h-full min-h-0 flex-col">
      {/* Conteneur de défilement SIMPLE. Le centrage est porté par l'enfant
          ci-dessous, pas par ce scroller : `justify-center` + `overflow-y-auto`
          sur le même élément rend le haut du contenu débordant INATTEIGNABLE
          (piège flexbox classique). */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            // `min-h-full` : centré quand le contenu tient, hauteur naturelle
            // et entièrement scrollable quand il déborde.
            "flex min-h-full items-center justify-center px-6 py-4 sm:py-8",
            layout === "split"
              ? "flex-col-reverse sm:flex-row gap-6 sm:gap-10"
              : "flex-col gap-6",
          )}
        >
        {/* Mascotte centrée (centered) ou à droite (split) */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 300, damping: 22 }}
          className="shrink-0"
        >
          <MascotAnimated
            mood={mood}
            size={layout === "centered" ? "lg" : "md"}
            interactive
            disableConfetti
          />
        </motion.div>

        <div
          className={cn(
            "flex-1 max-w-md",
            layout === "centered" ? "text-center" : "text-left",
          )}
        >
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="font-serif text-2xl sm:text-3xl text-sousou-secondary mb-3"
          >
            {title}
          </motion.h2>
          {subtitle && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              className="text-sm sm:text-base text-sousou-neutral leading-relaxed mb-5"
            >
              {subtitle}
            </motion.div>
          )}
          {children && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.25 }}
              className="mb-2"
            >
              {children}
            </motion.div>
          )}
          {layout === "split" && splitContent && (
            <div className="hidden sm:block mt-4">{splitContent}</div>
          )}
          </div>
        </div>
      </div>

      {/* Footer : frère du scroller et `shrink-0` → il ne peut plus être rogné,
          quelle que soit la hauteur du contenu ou de l'écran. */}
      <div className="shrink-0 border-t border-border/60 px-6 py-4 flex items-center justify-between gap-3">
        {onPrevious ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onPrevious}
            disabled={primaryLoading}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Précédent</span>
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          onClick={() => void onPrimary()}
          disabled={primaryDisabled || primaryLoading}
        >
          {primaryLoading ? "..." : primaryLabel}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
