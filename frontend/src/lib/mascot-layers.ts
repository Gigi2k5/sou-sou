/**
 * Positions et tailles relatives (en %) de chaque pièce de la mascotte
 * dans son conteneur carré. Toutes les pièces sont positionnées en
 * `position: absolute` à l'intérieur d'une `<div className="relative">`.
 *
 * Conventions :
 *   - `top`/`left`/`right`/`bottom` exprimés en pourcentage du parent
 *   - `width` exprimé en pourcentage du parent (la hauteur suit en `auto`)
 *   - `translateX`/`translateY` permettent un centrage post-positionnement
 *     (typiquement `-50%` quand on ancre par le centre via `left: 50%`)
 *
 * ⚠️ Valeurs INITIALES — à affiner sur la page `/dev/mascot` (mode
 * ajustement). Coller le JSON final ici quand validé.
 */

export interface LayerPosition {
  top?: number; // %
  left?: number; // %
  right?: number; // %
  bottom?: number; // %
  width?: number; // %
  translateX?: number; // %
  translateY?: number; // %
}

export type LayerKey =
  | "wings"
  | "body"
  | "armRight"
  | "armLeft"
  | "eyes"
  | "mouth"
  | "coin"
  | "sparkle";

// Valeurs finalisées via la page /dev/mascot (2026-05-01).
// Le canvas est volontairement plus grand que le corps : ça laisse respirer
// les ailes (top négatif = dépassement vers le haut), les bras et la pièce.
export const MASCOT_LAYERS: Record<LayerKey, LayerPosition> = {
  wings: { top: -50, left: 0, width: 120, translateX: -50 },
  body: { top: 8, left: 50, width: 60, translateX: -50 },
  armRight: { top: 42, left: 27, width: 17 },
  armLeft: { top: 34, right: 20, width: 22 },
  // eyes-open et eyes-closed partagent le même calage — c'est essentiel
  // pour que le clignement n'ait pas de "saut" visuel.
  eyes: { top: 24, left: 50, width: 35, translateX: -50 },
  mouth: { top: 40, left: 35, width: 29, translateX: -50 },
  coin: { top: 14, left: 64, width: 14 },
  sparkle: { top: 15, left: 10, width: 15 },
};

/** Convertit une LayerPosition en `style` React (avec `transform`). */
export function layerToStyle(p: LayerPosition): React.CSSProperties {
  const transforms: string[] = [];
  if (p.translateX !== undefined) transforms.push(`translateX(${p.translateX}%)`);
  if (p.translateY !== undefined) transforms.push(`translateY(${p.translateY}%)`);
  return {
    position: "absolute",
    top: p.top !== undefined ? `${p.top}%` : undefined,
    left: p.left !== undefined ? `${p.left}%` : undefined,
    right: p.right !== undefined ? `${p.right}%` : undefined,
    bottom: p.bottom !== undefined ? `${p.bottom}%` : undefined,
    width: p.width !== undefined ? `${p.width}%` : undefined,
    transform: transforms.length > 0 ? transforms.join(" ") : undefined,
  };
}
