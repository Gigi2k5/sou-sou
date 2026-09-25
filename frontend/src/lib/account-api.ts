import type { AccountExport } from "@/types/account";

import { buildAccountWorkbook } from "./account-workbook";
import { api } from "./api";

/**
 * Déclenche un téléchargement à partir d'un contenu déjà en mémoire.
 *
 * On passe par `fetch` plutôt que par un simple lien : un lien ne permet ni
 * d'attendre, ni d'afficher une erreur. Or ces appels peuvent échouer — session
 * expirée, limite de fréquence atteinte — et laisser quelqu'un cliquer dans le
 * vide sur « télécharger mes données » est exactement le genre de silence qui
 * fait douter de tout le reste.
 */
function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Libère la mémoire : un export volumineux resterait sinon en RAM jusqu'au
  // rechargement de la page.
  URL.revokeObjectURL(url);
}

/**
 * Le nom du fichier est construit ICI, pas lu dans la réponse.
 *
 * Le serveur envoie bien un `Content-Disposition` daté, mais le navigateur le
 * masque : en requête inter-domaines, seuls quelques en-têtes sont lisibles par
 * le script. On récupérait donc toujours le nom de secours, sans date — et deux
 * exports successifs se seraient écrasés dans le dossier de téléchargement.
 */
function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** La copie intégrale, telle que le serveur la constitue. */
async function fetchExport(): Promise<AccountExport> {
  const res = await api.get<AccountExport>("/account/export");
  return res.data;
}

/**
 * Classeur Excel — celui que les gens ouvriront réellement.
 *
 * Le serveur n'envoie que du JSON ; la mise en forme se fait ici. Ça évite une
 * seconde route, une dépendance de plus côté serveur, et surtout ça garantit
 * que les deux formats décrivent exactement les mêmes données : ils sortent de
 * la même réponse.
 */
export async function downloadAccountXlsx(): Promise<void> {
  const data = await fetchExport();
  const blob = await buildAccountWorkbook(data);
  save(blob, `sousou-donnees-${stamp()}.xlsx`);
}

/** La copie brute, pour qui veut tout, y compris ce qu'un tableau ne dit pas. */
export async function downloadAccountJson(): Promise<void> {
  const data = await fetchExport();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  save(blob, `sousou-donnees-${stamp()}.json`);
}

export async function deleteAccount(password: string): Promise<void> {
  await api.delete("/account/me", { data: { password } });
}
