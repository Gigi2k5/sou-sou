"use client";

import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ACCEPTED_EXTENSIONS } from "@/lib/spreadsheet/read-file";
import { cn } from "@/lib/utils";

interface FileDropProps {
  busy: boolean;
  onFile: (file: File) => void;
}

/**
 * Dépôt d'un fichier, au-dessus du collage de texte plutôt que sur un écran à
 * part.
 *
 * Le fichier ne part PAS au serveur : il est lu dans le navigateur, et son
 * contenu vient remplir cet écran comme si l'utilisateur l'avait collé. C'est
 * ce qui permet de tenir la promesse affichée en bas de page — rien ne sort de
 * l'appareil tant qu'il n'a pas vu ce qui sortira.
 */
export function FileDrop({ busy, onFile }: FileDropProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!busy) take(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-2xl border-2 border-dashed p-5 text-center transition-colors sm:p-6",
        over
          ? "border-sousou-primary bg-sousou-primary/5"
          : "border-border bg-card",
      )}
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          // Permet de redéposer le MÊME fichier après une correction : sans ça
          // l'événement `change` ne se déclenche pas une seconde fois.
          e.target.value = "";
        }}
      />

      {busy ? (
        <p className="inline-flex items-center gap-2 py-2 text-sm text-sousou-secondary">
          <Loader2 className="size-4 animate-spin text-sousou-primary" />
          Lecture du fichier…
        </p>
      ) : (
        <>
          <FileSpreadsheet className="mx-auto mb-2 size-7 text-sousou-primary" />
          <p className="mb-1 font-serif text-lg text-sousou-secondary">
            Dépose ton fichier
          </p>
          <p className="mx-auto mb-4 max-w-sm text-sm text-sousou-neutral">
            Excel ou CSV, tel quel. Je le lis sur ton téléphone — il ne part
            nulle part tant que tu n&apos;as rien validé.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:w-auto"
            onClick={() => input.current?.click()}
          >
            <Upload className="size-4" />
            Choisir un fichier
          </Button>
        </>
      )}
    </div>
  );
}
