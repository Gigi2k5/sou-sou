"use client";

import { motion } from "framer-motion";

import { layerToStyle, type LayerPosition } from "@/lib/mascot-layers";

const PARTS_BASE = "/mascot/parts";

/** Étincelle additionnelle pour `happy` ou les mini-réactions. */
export function ExtraSparkle({
  position,
  delay,
  duration = 1.6,
}: {
  position: LayerPosition;
  delay: number;
  duration?: number;
}) {
  return (
    <motion.img
      src={`${PARTS_BASE}/sparkle.png`}
      alt=""
      draggable={false}
      loading="lazy"
      style={{ ...layerToStyle({ ...position, width: 12 }), zIndex: 8 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

/**
 * Explosion de 8 sparkles autour de la mascotte pour `celebrating`.
 * Positions distribuées sur un cercle approximatif.
 */
const BURST_POSITIONS: LayerPosition[] = [
  { top: -5, left: 50, translateX: -50 },
  { top: 5, left: 5 },
  { top: 5, left: 80 },
  { top: 35, left: -8 },
  { top: 35, left: 95 },
  { top: 60, left: 0 },
  { top: 60, left: 88 },
  { top: 80, left: 50, translateX: -50 },
];

export function CelebrationSparkles() {
  return (
    <>
      {BURST_POSITIONS.map((pos, i) => (
        <motion.img
          key={i}
          src={`${PARTS_BASE}/sparkle.png`}
          alt=""
          draggable={false}
          loading="lazy"
          style={{ ...layerToStyle({ ...pos, width: 14 }), zIndex: 9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.2, 1, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}

/**
 * Traînée de 4 sparkles "derrière" la mascotte pour `flying`.
 * Apparaissent à droite haut, descendent et fadent comme une comète.
 */
const TRAIL_POSITIONS = [
  { top: 30, left: 78 },
  { top: 50, left: 88 },
  { top: 70, left: 80 },
  { top: 60, left: 95 },
];

export function FlyingTrail() {
  return (
    <>
      {TRAIL_POSITIONS.map((pos, i) => (
        <motion.img
          key={i}
          src={`${PARTS_BASE}/sparkle.png`}
          alt=""
          draggable={false}
          loading="lazy"
          style={{ ...layerToStyle({ ...pos, width: 8 }), zIndex: 7 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.9, 0],
            scale: [0.4, 1, 0.4],
            x: [-5, 10],
            y: [-3, 8],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeIn",
          }}
        />
      ))}
    </>
  );
}

/**
 * Petits "Z" qui flottent au-dessus de la tête en `sleeping`.
 * SVG inline pour éviter un asset supplémentaire.
 */
const Z_PARAMS = [
  { left: 60, delay: 0, fontSize: 14 },
  { left: 70, delay: 1.2, fontSize: 18 },
  { left: 80, delay: 2.4, fontSize: 22 },
];

export function SleepingZs() {
  return (
    <>
      {Z_PARAMS.map((z, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute font-serif font-bold text-sousou-secondary/70 select-none"
          style={{
            top: "10%",
            left: `${z.left}%`,
            zIndex: 9,
            fontSize: z.fontSize,
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.8, 0.8, 0],
            y: [0, -30, -45, -55],
            x: [0, 4, -2, 6],
          }}
          transition={{
            duration: 3.6,
            repeat: Infinity,
            delay: z.delay,
            ease: "easeOut",
          }}
        >
          z
        </motion.span>
      ))}
    </>
  );
}
