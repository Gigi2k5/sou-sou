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
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "flex-1 flex items-center justify-center px-6 py-4 sm:py-8 overflow-y-auto",
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

      {/* Footer fixe : nav. Pas de motion ici — le footer reste cliquable
          immédiatement même pendant l'animation d'entrée des éléments du body. */}
      <div className="border-t border-border/60 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
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
