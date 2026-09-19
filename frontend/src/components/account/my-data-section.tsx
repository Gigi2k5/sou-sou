"use client";

import { Download, FileJson, FileSpreadsheet, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import { Button } from "@/components/ui/button";
import { downloadAccountCsv, downloadAccountJson } from "@/lib/account-api";
import { extractApiErrorMessage } from "@/lib/api";

/**
 * « Mes données » : tout reprendre, ou tout effacer.
 *
 * Ces deux boutons ne servent presque jamais, et c'est justement pour ça
 * qu'ils comptent. Une application où l'on peut tout mettre et rien reprendre
 * n'est pas un outil, c'est un piège — et personne ne confie ses comptes à un
 * endroit dont il ne sait pas comment sortir.
 */
export function MyDataSection() {
  const [busy, setBusy] = useState<"csv" | "json" | null>(null);
  const [confirming, setConfirming] = useState(false);

  const run = async (kind: "csv" | "json") => {
    setBusy(kind);
    try {
      await (kind === "csv" ? downloadAccountCsv() : downloadAccountJson());
      toast.success("Téléchargement lancé.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Téléchargement impossible."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <section>
        <h2 className="mb-1 font-serif text-xl text-sousou-secondary">
          Mes données
        </h2>
        <p className="mb-4 text-sm text-sousou-neutral">
          Elles sont à toi. Tu peux en prendre une copie quand tu veux, et tout
          effacer quand tu veux.
        </p>

        <div className="space-y-2">
          <DataButton
            icon={<FileSpreadsheet className="size-5" />}
            title="Télécharger pour Excel"
            hint="Toutes mes transactions en CSV, prêtes à ouvrir dans un tableur"
            busy={busy === "csv"}
            onClick={() => void run("csv")}
          />
          <DataButton
            icon={<FileJson className="size-5" />}
            title="Télécharger tout"
            hint="Copie intégrale en JSON : profil, budgets, cotisations, imports, articles"
            busy={busy === "json"}
            onClick={() => void run("json")}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-serif text-xl text-sousou-secondary">
          Supprimer mon compte
        </h2>
        <p className="mb-4 text-sm text-sousou-neutral">
          Efface définitivement ton compte et tout ce qu&apos;il contient. Cette
          action ne peut pas être annulée.
        </p>
        <Button
          type="button"
          variant="destructive"
          className="h-11 w-full sm:w-auto"
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="size-4" />
          Supprimer mon compte
        </Button>
      </section>

      <DeleteAccountDialog
        open={confirming}
        onOpenChange={setConfirming}
        onDeleted={() => {
          setConfirming(false);
          toast.success("Ton compte a été supprimé. Prends soin de toi.");
          // Rechargement complet plutôt que navigation : il faut purger tout
          // l'état client (profil en mémoire, caches) d'un compte qui n'existe
          // plus, sinon l'application continue d'afficher ses données.
          window.location.href = "/";
        }}
      />
    </>
  );
}

function DataButton({
  icon,
  title,
  hint,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sousou-primary-50 text-sousou-primary-700">
        {busy ? <Loader2 className="size-5 animate-spin" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-sousou-secondary">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-sousou-neutral">{hint}</span>
      </span>
      <Download className="size-4 shrink-0 text-sousou-neutral" />
    </button>
  );
}
