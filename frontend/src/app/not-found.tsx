"use client";

import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-svh flex items-center justify-center px-4 py-10 bg-gradient-to-b from-sousou-primary-50 via-background to-background">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <MascotAnimated mood="thinking" size="lg" interactive disableConfetti />
        </div>

        <p className="font-mono text-sm text-sousou-primary uppercase tracking-widest mb-2">
          Erreur 404
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-sousou-secondary mb-3 leading-tight">
          Cette page s&apos;est volatilisée
        </h1>
        <p className="text-sousou-neutral mb-6">
          Elle a peut-être été déplacée ou supprimée — ou alors le lien n&apos;a
          jamais existé. Ça arrive.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link href="/dashboard">
                <Home className="size-4" />
                Retour au dashboard
              </Link>
            }
          />
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={
              <Link href="/">
                <ArrowLeft className="size-4" />
                Page d&apos;accueil
              </Link>
            }
          />
        </div>
      </div>
    </main>
  );
}
