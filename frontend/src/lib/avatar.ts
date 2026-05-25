/**
 * Helpers pour l'avatar utilisateur.
 *
 * En DB on stocke une string opaque :
 *   - "preset:pig-green"       → preset servi côté front via /avatars/avatar-pig-green.png
 *   - "upload:<value>"         → upload utilisateur. Le `<value>` peut être :
 *       • un `public_id` Cloudinary (ex: "sousou/avatars/u123") si le backend
 *         a CLOUDINARY_URL configuré → résolu via NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *       • un filename filesystem (ex: "u123.jpg") sinon → servi via /uploads/avatars/
 *     On détecte par la présence d'un slash dans la valeur (les public_ids
 *     contiennent toujours "sousou/avatars/...", les filenames jamais de slash).
 *   - null                     → pas d'avatar, on affiche les initiales
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

export interface AvatarPreset {
  id: string;
  url: string;
  label: string;
  hint: string;
}

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  { id: "pig-green", url: "/avatars/avatar-pig-green.png", label: "Cochon", hint: "comme la mascotte" },
  { id: "lion", url: "/avatars/avatar-lion.png", label: "Lion", hint: "force" },
  { id: "elephant", url: "/avatars/avatar-elephant.png", label: "Éléphant", hint: "sagesse, mémoire" },
  { id: "fox", url: "/avatars/avatar-fox.png", label: "Renard", hint: "malin" },
  { id: "owl", url: "/avatars/avatar-owl.png", label: "Chouette", hint: "sagesse" },
  { id: "bee", url: "/avatars/avatar-bee.png", label: "Abeille", hint: "travail" },
  { id: "turtle", url: "/avatars/avatar-turtle.png", label: "Tortue", hint: "lent mais sûr" },
  { id: "squirrel", url: "/avatars/avatar-squirrel.png", label: "Écureuil", hint: "réserve" },
] as const;

const PRESET_BY_ID = new Map(AVATAR_PRESETS.map((p) => [p.id, p]));

/** Résout l'URL finale à partir de la string opaque stockée en DB. */
export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("preset:")) {
    const preset = PRESET_BY_ID.get(avatarUrl.slice("preset:".length));
    return preset?.url ?? null;
  }
  if (avatarUrl.startsWith("upload:")) {
    const value = avatarUrl.slice("upload:".length);
    // Public_id Cloudinary (contient "/") → résolution via le CDN Cloudinary.
    // `q_auto,f_auto` : qualité et format choisis automatiquement par Cloudinary
    // selon le navigateur (WebP/AVIF si supporté, JPG sinon).
    if (value.includes("/") && CLOUDINARY_CLOUD_NAME) {
      return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/q_auto,f_auto/${value}`;
    }
    // Filename legacy filesystem → servi par le backend.
    return `${API_URL}/uploads/avatars/${value}`;
  }
  // Format inconnu — on ignore au lieu de planter.
  return null;
}

/** Retourne le preset id sélectionné, si l'avatarUrl est un preset. */
export function getSelectedPresetId(
  avatarUrl: string | null | undefined,
): string | null {
  if (!avatarUrl?.startsWith("preset:")) return null;
  return avatarUrl.slice("preset:".length);
}

/** Initiales à afficher quand pas d'avatar (max 2 lettres). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Lit un fichier image et retourne sa data URL base64.
 * Lève une Error en cas de problème de lecture.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("FileReader a renvoyé un résultat non-string"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Lecture impossible"));
    reader.readAsDataURL(file);
  });
}
