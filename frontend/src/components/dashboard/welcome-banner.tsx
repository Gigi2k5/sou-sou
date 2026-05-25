"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Gift, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "sousou:welcome-dismissed";

/**
 * Banner de bienvenue affiché au premier login après inscription.
 * Persistance via localStorage : une fois dismissé, plus jamais réaffiché
 * sur ce navigateur. Si l'utilisateur change d'appareil il ne le verra plus —
 * acceptable pour un message d'onboarding non critique.
 */
export function WelcomeBanner() {
  // null = pas encore lu localStorage (SSR-safe), true/false ensuite.
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== "true");
    } catch {
      setVisible(false);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // localStorage indisponible (mode privé strict, etc.) — pas grave.
    }
  }

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="welcome"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="relative rounded-2xl bg-gradient-to-r from-sousou-primary-50 via-card to-sousou-primary-50 border border-sousou-primary/30 p-4 sm:p-5 pr-12 flex items-center gap-4">
            <div className="size-10 sm:size-11 rounded-xl bg-sousou-primary text-white flex items-center justify-center shrink-0 shadow-md">
              <Gift className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sousou-secondary text-sm sm:text-base">
                Bienvenue chez Sou&apos;Sou !
              </p>
              <p className="text-xs sm:text-sm text-sousou-neutral mt-0.5">
                On t&apos;a préparé quelques sources et catégories pour
                démarrer. Tu peux les renommer ou en ajouter dans{" "}
                <Link
                  href="/parametres"
                  className="text-sousou-primary-700 font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  Paramètres <ArrowRight className="size-3" />
                </Link>
                .
              </p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={dismiss}
              className="absolute top-2 right-2 hover:bg-sousou-primary/10"
              aria-label="Fermer le message d'accueil"
            >
              <X className="size-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
