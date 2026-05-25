"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Sou'Sou error boundary:", error);
  }, [error]);

  return (
    <main className="min-h-svh flex items-center justify-center px-4 py-10 bg-gradient-to-b from-sousou-tertiary/10 via-background to-background">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <MascotAnimated mood="sad" size="lg" interactive disableConfetti />
        </div>

        <p className="font-mono text-sm text-sousou-tertiary uppercase tracking-widest mb-2">
          Oups
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-sousou-secondary mb-3 leading-tight">
          Quelque chose a coincé
        </h1>
        <p className="text-sousou-neutral mb-6">
          Une erreur inattendue est survenue. On a noté ce qui s&apos;est passé.
          Tu peux réessayer — si ça persiste, recharge la page.
        </p>

        {error.digest && (
          <p className="text-xs font-mono text-sousou-neutral mb-6">
            Code : {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button size="lg" onClick={() => reset()}>
            <RefreshCw className="size-4" />
            Réessayer
          </Button>
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<Link href="/dashboard">Retour au dashboard</Link>}
          />
        </div>
      </div>
    </main>
  );
}
