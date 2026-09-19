import { api } from "./api";

/**
 * Déclenche un téléchargement depuis une réponse binaire.
 *
 * On passe par `fetch` plutôt que par un simple lien : un lien ne permet ni
 * d'attendre, ni d'afficher une erreur. Or ces appels peuvent échouer — session
 * expirée, limite de fréquence atteinte — et laisser quelqu'un cliquer dans le
 * vide sur « télécharger mes données » est exactement le genre de silence qui
 * fait douter de tout le reste.
 */
async function download(path: string, filename: string): Promise<void> {
  const res = await api.get<Blob>(path, { responseType: "blob" });

  const url = URL.createObjectURL(res.data);
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
 * le script, et celui-là n'en fait pas partie. On récupérait donc toujours le
 * nom de secours, sans date — et deux exports successifs se seraient écrasés
 * dans le dossier de téléchargement.
 */
function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Toutes les données du compte, en JSON. */
export function downloadAccountJson(): Promise<void> {
  return download("/account/export", `sousou-donnees-${stamp()}.json`);
}

/** Les transactions seules, en CSV — celui qui s'ouvre dans un tableur. */
export function downloadAccountCsv(): Promise<void> {
  return download("/account/export.csv", `sousou-transactions-${stamp()}.csv`);
}

export async function deleteAccount(password: string): Promise<void> {
  await api.delete("/account/me", { data: { password } });
}
