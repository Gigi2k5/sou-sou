"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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

  /**
   * Persistance de l'étape — dans un EFFET, jamais dans un updater.
   *
   * ⚠️ `persistStep()` était appelé À L'INTÉRIEUR de la fonction passée à
   * `setStep`. Un updater doit être du pur calcul : React l'exécute pendant la
   * phase de rendu et le REJOUE (deux fois en StrictMode). Conséquences : deux
   * requêtes PATCH par clic, et surtout, si l'appel lève, la mise à jour
   * d'état est perdue — le clic semble alors « ne rien faire ».
   *
   * `persistedRef` empêche le PATCH au montage (on ne réécrit pas une valeur
   * qui vient du serveur) et les doublons.
   */
  const persistedRef = useRef<number | null>(null);
  useEffect(() => {
    if (persistedRef.current === null) {
      persistedRef.current = step; // montage : rien à persister
      return;
    }
    if (persistedRef.current === step) return;
    persistedRef.current = step;
    void updateOnboarding({ step }).catch(() => {
      // Échec silencieux et non bloquant : l'utilisateur avance quand même.
    });
  }, [step]);

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const previous = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  /**
   * « Ignorer » — doit être DURABLE. L'ancienne croix ne faisait que
   * `setDismissed(true)` : un état local, perdu au rechargement. La modale
   * revenait donc indéfiniment, sans aucun moyen d'y échapper.
   *
   * Le backend n'expose pas d'état « refusé » distinct : `completed: true` est
   * la seule façon de marquer l'onboarding comme réglé. On ferme localement
   * même si l'appel échoue — on ne piège jamais l'utilisateur dans la modale.
   */
  const handleSkip = useCallback(async () => {
    setDismissed(true);
    try {
      await updateOnboarding({ completed: true, step });
      await refresh();
    } catch {
      // Ignoré volontairement : la modale est déjà fermée côté client.
    }
  }, [step, refresh]);

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await updateOnboarding({
        completed: true,
        step: TOTAL_STEPS - 1,
      });
      setConfettiKey((k) => k + 1);
      // Fermeture locale immédiate : ne pas dépendre du seul `refresh()`.
      // Si `/auth/me` échouait ou tardait, le bouton restait bloqué sur « … »
      // et la modale ne se fermait jamais.
      setDismissed(true);
      setCompleting(false);
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

  // Échap : seconde sortie, attendue de toute modale.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSkip]);

  if (!user || user.hasCompletedOnboarding || dismissed) return null;

  return (
    <>
      <ConfettiBurst trigger={confettiKey} />
      <div
        className={cn(
          "fixed inset-0 z-[60] flex items-center justify-center",
          // Backdrop branded opaque : dégradé navy → primary. Isole
          // l'onboarding comme un moment "premier contact" — plus de fuite
          // visuelle vers le dashboard qui n'a encore rien à montrer.
          "bg-gradient-to-br from-sousou-secondary via-[#1a2f45] to-sousou-primary-700",
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
            {/* Sortie explicite. L'ancienne croix de 28 px (sous la cible
                tactile de 44) ne portait aucun libellé et ne persistait rien :
                personne ne la percevait comme un « ignorer », et elle ne
                fonctionnait pas. */}
            <button
              type="button"
              onClick={() => void handleSkip()}
              className="shrink-0 inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-sousou-neutral hover:bg-muted hover:text-sousou-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              title="Passer l'introduction — elle ne réapparaîtra plus"
            >
              Ignorer
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
