import { api } from "./api";
import type {
  CommitImportInput,
  CommitImportResult,
  ImportAnalysis,
  ImportBatch,
} from "@/types/import";

/**
 * L'analyse traverse un modèle de langage : elle prend couramment 30 à 60 s sur
 * un mois de notes, bien au-delà des 20 s de timeout par défaut de `api`.
 * On l'allonge ici, et seulement ici — les autres routes doivent rester
 * promptes à échouer.
 */
const ANALYZE_TIMEOUT_MS = 150_000;

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
