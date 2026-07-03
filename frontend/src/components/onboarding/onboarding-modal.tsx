"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ConfettiBurst } from "@/components/savings/confetti-burst";
import { extractApiErrorMessage } from "@/lib/api";
import { updateOnboarding } from "@/lib/onboarding-api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { ProgressDots } from "./progress-dots";
import { StepDone } from "./step-done";
import { StepSavings } from "./step-savings";
import { StepTheme } from "./step-theme";
import { StepTracker } from "./step-tracker";
import { StepWelcome } from "./step-welcome";

const TOTAL_STEPS = 5;

/**
 * Modale plein écran d'onboarding — apparaît automatiquement quand l'user
 * authentifié n'a pas encore terminé son flow (`hasCompletedOnboarding=false`).
 *
 * Bouton "Plus tard" : dismiss local pour la session courante (la modale
 * réapparaît au prochain reload tant que `hasCompletedOnboarding=false`).
 *
 * Animation entre étapes : crossfade simple via key sur la motion.div.
 */
export function OnboardingModal() {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(() =>
    Math.min(Math.max(user?.onboardingStep ?? 0, 0), TOTAL_STEPS - 1),
  );
  const [completing, setCompleting] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Persiste fire-and-forget la step en DB. Pas bloquant.
  const persistStep = useCallback((s: number) => {
    void updateOnboarding({ step: s }).catch(() => {
      // Silent fail — l'user terminera quand même son flow.
    });
  }, []);

  const next = useCallback(() => {
    setStep((s) => {
      const n = Math.min(s + 1, TOTAL_STEPS - 1);
      if (n !== s) persistStep(n);
      return n;
    });
  }, [persistStep]);

  const previous = useCallback(() => {
    setStep((s) => {
      const n = Math.max(s - 1, 0);
      if (n !== s) persistStep(n);
      return n;
    });
  }, [persistStep]);

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await updateOnboarding({
        completed: true,
        step: TOTAL_STEPS - 1,
      });
      setConfettiKey((k) => k + 1);
      await refresh();
      const badgeName = res.newBadges[0]?.name;
      if (res.pointsEarned > 0) {
        toast.success(
          badgeName
            ? `+${res.pointsEarned} points et badge « ${badgeName} » débloqué !`
            : `+${res.pointsEarned} points ajoutés à ton compte !`,
          { duration: 5000 },
        );
      } else {
        toast.success("Onboarding terminé !");
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Action impossible"));
      setCompleting(false);
    }
  }

  if (!user || user.hasCompletedOnboarding || dismissed) return null;

  return (
    <>
      <ConfettiBurst trigger={confettiKey} />
      <div
        className={cn(
          "fixed inset-0 z-[60] flex items-center justify-center",
          "bg-sousou-secondary/40 dark:bg-black/60 backdrop-blur-sm",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className={cn(
            "relative w-full sm:w-[min(100%-2rem,640px)] sm:rounded-3xl",
            "bg-card border-t sm:border border-border/60 shadow-2xl shadow-sousou-secondary/20",
            // Hauteur fixe en desktop pour que flex-1 du body ait toujours de quoi
            // s'étendre indépendamment du contenu de la step.
            "h-svh sm:h-[min(720px,calc(100vh-2rem))]",
            "flex flex-col overflow-hidden",
          )}
        >
          {/* Header avec progression + skip. aria-live pour annoncer le
              changement d'étape aux lecteurs d'écran. */}
          <header
            className="px-6 py-4 border-b border-border/60 flex items-center gap-3 shrink-0"
            aria-live="polite"
            aria-atomic="true"
          >
            <span
              id="onboarding-title"
              className="text-xs font-semibold uppercase tracking-wider text-sousou-neutral shrink-0"
            >
              Étape {step + 1} sur {TOTAL_STEPS}
            </span>
            <ProgressDots
              total={TOTAL_STEPS}
              current={step}
              className="flex-1 justify-center"
            />
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="shrink-0 p-1.5 rounded-full text-sousou-neutral hover:bg-muted hover:text-sousou-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Plus tard"
              title="Continuer plus tard"
            >
              <X className="size-4" />
            </button>
          </header>

          {/* Body — crossfade via key. Pas d'AnimatePresence pour rester simple
              et ne jamais bloquer les clics du footer. La motion.div interne est
              dans le flux normal (h-full) — surtout pas `position: absolute`
              sinon le parent flex-1 se collapse à 0px de hauteur. */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {step === 0 && (
                <StepWelcome userName={user.name} onNext={next} />
              )}
              {step === 1 && (
                <StepTracker onNext={next} onPrevious={previous} />
              )}
              {step === 2 && (
                <StepSavings onNext={next} onPrevious={previous} />
              )}
              {step === 3 && (
                <StepTheme onNext={next} onPrevious={previous} />
              )}
              {step === 4 && (
                <StepDone
                  onComplete={handleComplete}
                  loading={completing}
                  onPrevious={previous}
                />
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
