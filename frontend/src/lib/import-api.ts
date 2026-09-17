import axios from "axios";

import { api, extractApiErrorMessage } from "./api";
import type {
  CommitImportInput,
  CommitImportResult,
  ImportAnalysis,
  ImportBatch,
} from "@/types/import";

/**
 * L'analyse traverse un modèle de langage : ~15 à 20 s sur un mois de notes,
 * au-delà des 20 s de timeout par défaut de `api`. On l'allonge ici, et
 * seulement ici — les autres routes doivent rester promptes à échouer. La marge
 * est large à dessein : un carnet inhabituellement long reste plus lent.
 */
const ANALYZE_TIMEOUT_MS = 150_000;

/**
 * Traduit un échec d'analyse en phrase actionnable.
 *
 * Une requête qui dure 15 s est fragile par nature : un backend qui redémarre,
 * un wifi qui saute, et elle meurt SANS réponse. Le navigateur présente alors
 * ça comme une « erreur CORS », ce qui envoie chercher le problème exactement
 * là où il n'est pas. `extractApiErrorMessage` ne peut rien en dire non plus,
 * faute de corps de réponse — d'où ce traitement dédié.
 */
export function describeAnalyzeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return "L'analyse a pris trop de temps. Essaie avec un seul mois à la fois.";
    }
    // Aucune réponse reçue : la connexion a été coupée en cours de route.
    if (!err.response) {
      return "La connexion au serveur a été interrompue. Ton texte est intact, réessaie.";
    }
    if (err.response.status === 429) {
      return extractApiErrorMessage(
        err,
        "Trop d'analyses en peu de temps. Réessaie dans quelques minutes.",
      );
    }
  }
  return extractApiErrorMessage(err, "Analyse impossible");
}

export async function analyzeImport(
  text: string,
  dateFormat?: "DMY" | "MDY",
): Promise<ImportAnalysis> {
  const { data } = await api.post<ImportAnalysis>(
    "/import/analyze",
    { text, ...(dateFormat ? { dateFormat } : {}) },
    { timeout: ANALYZE_TIMEOUT_MS },
  );
  return data;
}

export async function commitImport(
  input: CommitImportInput,
): Promise<CommitImportResult> {
  const { data } = await api.post<CommitImportResult>("/import/commit", input);
  return data;
}

export async function listImportBatches(): Promise<ImportBatch[]> {
  const { data } = await api.get<ImportBatch[]>("/import/batches");
  return data;
}

export async function undoImport(
  batchId: string,
): Promise<{ deletedCount: number }> {
  const { data } = await api.delete<{ deletedCount: number }>(
    `/import/batches/${batchId}`,
  );
  return data;
}
