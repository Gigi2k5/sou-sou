"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Champ de mot de passe avec bascule d'affichage.
 *
 * Saisir un mot de passe à l'aveugle sur un téléphone, clavier tactile et
 * correction automatique comprises, est la première cause d'échec de connexion.
 * Pouvoir relire ce qu'on tape évite l'aller-retour « mot de passe incorrect »
 * alors qu'il ne manquait qu'une majuscule.
 *
 * La bascule ne change QUE le type du champ, côté navigateur. Rien n'est
 * transmis, enregistré ni mémorisé : en rouvrant la page, le champ est masqué.
 *
 * S'utilise exactement comme `Input` — `register()` de react-hook-form compris,
 * puisque toutes les propriétés inconnues, `ref` incluse, sont transmises au
 * champ réel.
 */
function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        // Réserve la place de l'œil : sans ça un mot de passe long passe
        // dessous et devient illisible au moment même où on l'affiche.
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // `aria-pressed` dit l'ÉTAT, le libellé dit l'ACTION. Un lecteur
        // d'écran annonce ainsi « Afficher le mot de passe, non coché ».
        aria-pressed={visible}
        aria-label={
          visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
        }
        title={visible ? "Masquer" : "Afficher"}
        className={cn(
          // `inset-y-0` plutôt qu'une hauteur fixe : le bouton épouse la
          // hauteur du champ, qui varie d'un écran à l'autre (h-10 ailleurs,
          // h-11 dans le dialogue de suppression).
          "absolute inset-y-0 right-0 flex w-12 items-center justify-center",
          "rounded-r-xl text-sousou-neutral transition-colors",
          "hover:text-sousou-secondary",
          "focus:outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
        )}
      >
        {visible ? (
          <EyeOff className="size-4.5" aria-hidden="true" />
        ) : (
          <Eye className="size-4.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
