"use client";

import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CelebrationSparkles,
  ExtraSparkle,
  FlyingTrail,
  SleepingZs,
} from "@/components/mascot/mascot-effects";
import { ConfettiBurst } from "@/components/savings/confetti-burst";
import { useBlink } from "@/hooks/use-blink";
import {
  layerToStyle,
  MASCOT_LAYERS,
  type LayerPosition,
} from "@/lib/mascot-layers";
import { cn } from "@/lib/utils";

export type MascotMood =
  | "idle"
  | "happy"
  | "celebrating"
  | "warning"
  | "encouraging"
  | "thinking"
  | "sleeping"
  | "sad"
  | "flying";

export type MascotSize = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<MascotSize, number> = {
  sm: 80,
  md: 120,
  lg: 200,
  xl: 300,
};

const PARTS_BASE = "/mascot/parts";

interface MascotAnimatedProps {
  mood?: MascotMood;
  size?: MascotSize;
  /** Active les mini-réactions au clic. */
  interactive?: boolean;
  /**
   * Override des positions des layers (utilisé par /dev/mascot).
   * Laisser `undefined` en prod pour utiliser `MASCOT_LAYERS`.
   */
  layersOverride?: typeof MASCOT_LAYERS;
  /**
   * Si true, le ConfettiBurst plein écran ne se déclenche pas pour le mood
   * `celebrating`. Utile sur la page /dev/mascot où on affiche plusieurs
   * mascottes en `celebrating` simultanément.
   */
  disableConfetti?: boolean;
  className?: string;
}

type ClickReaction =
  | "jump"
  | "blink2x"
  | "coinToss"
  | "twist"
  | "sparkles"
  | "miniFly";

const REGULAR_REACTIONS: ClickReaction[] = [
  "jump",
  "blink2x",
  "coinToss",
  "twist",
  "sparkles",
];

/** ~10 % de chance d'easter-egg miniFly, sinon une réaction "normale". */
function pickClickReaction(): ClickReaction {
  if (Math.random() < 0.1) return "miniFly";
  return REGULAR_REACTIONS[
    Math.floor(Math.random() * REGULAR_REACTIONS.length)
  ];
}

export function MascotAnimated({
  mood = "idle",
  size = "md",
  interactive = false,
  layersOverride,
  disableConfetti = false,
  className,
}: MascotAnimatedProps) {
  const sizePx = SIZE_PX[size];
  const layers = layersOverride ?? MASCOT_LAYERS;
  const reduceMotion = useReducedMotion();

  // ---- Clignement (désactivé en `sleeping` et `sad`) -----------------------
  const blinkEnabled = mood !== "sleeping" && mood !== "sad";
  const naturalClosed = useBlink({ enabled: blinkEnabled && !reduceMotion });
  const [forceCloseTick, setForceCloseTick] = useState(0); // pour blink2x
  const [forceClosed, setForceClosed] = useState(false);

  const eyesOpenOpacity = useMemo(() => {
    if (mood === "sleeping") return 0;
    if (mood === "sad") return 0.6;
    if (forceClosed) return 0;
    return naturalClosed ? 0 : 1;
  }, [mood, naturalClosed, forceClosed]);
  const eyesClosedOpacity = useMemo(() => {
    if (mood === "sleeping") return 1;
    if (mood === "sad") return 0;
    if (forceClosed) return 1;
    return naturalClosed ? 1 : 0;
  }, [mood, naturalClosed, forceClosed]);

  // ---- ConfettiBurst plein écran sur passage à `celebrating` ---------------
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const prevMoodRef = useRef(mood);
  useEffect(() => {
    if (
      mood === "celebrating" &&
      prevMoodRef.current !== "celebrating" &&
      !disableConfetti &&
      !reduceMotion
    ) {
      setConfettiTrigger((t) => t + 1);
    }
    prevMoodRef.current = mood;
  }, [mood, disableConfetti, reduceMotion]);

  // ---- Mini-réactions au clic ---------------------------------------------
  const clickWrapControls = useAnimationControls();
  const [coinTossKey, setCoinTossKey] = useState(0);
  const [sparkleBurstKey, setSparkleBurstKey] = useState(0);
  const [miniFlyKey, setMiniFlyKey] = useState(0);

  // Mini-fly mode : ailes visibles + body lift pendant ~1s.
  const miniFlyActive = miniFlyKey > 0;
  useEffect(() => {
    if (!miniFlyActive) return;
    const id = setTimeout(() => setMiniFlyKey(0), 1100);
    return () => clearTimeout(id);
  }, [miniFlyKey, miniFlyActive]);

  // Sparkle-burst : 6 sparkles temporaires.
  const sparkleBurstActive = sparkleBurstKey > 0;
  useEffect(() => {
    if (!sparkleBurstActive) return;
    const id = setTimeout(() => setSparkleBurstKey(0), 1200);
    return () => clearTimeout(id);
  }, [sparkleBurstKey, sparkleBurstActive]);

  // Coin-toss : pièce qui s'envole et retombe.
  const coinTossActive = coinTossKey > 0;
  useEffect(() => {
    if (!coinTossActive) return;
    const id = setTimeout(() => setCoinTossKey(0), 1100);
    return () => clearTimeout(id);
  }, [coinTossKey, coinTossActive]);

  // Blink2x : double clignement rapide.
  useEffect(() => {
    if (forceCloseTick === 0) return;
    let alive = true;
    setForceClosed(true);
    const t1 = setTimeout(() => alive && setForceClosed(false), 130);
    const t2 = setTimeout(() => alive && setForceClosed(true), 260);
    const t3 = setTimeout(() => alive && setForceClosed(false), 390);
    return () => {
      alive = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [forceCloseTick]);

  const handleClick = useCallback(() => {
    if (!interactive || reduceMotion) return;
    const reaction = pickClickReaction();
    switch (reaction) {
      case "jump":
        void clickWrapControls.start({
          y: [0, -25, 0],
          transition: { duration: 0.5, ease: "easeOut" },
        });
        break;
      case "twist":
        void clickWrapControls.start({
          rotate: [0, 360],
          transition: { duration: 0.7, ease: "easeInOut" },
        });
        break;
      case "blink2x":
        setForceCloseTick((t) => t + 1);
        break;
      case "coinToss":
        setCoinTossKey((k) => k + 1);
        break;
      case "sparkles":
        setSparkleBurstKey((k) => k + 1);
        break;
      case "miniFly":
        setMiniFlyKey((k) => k + 1);
        break;
    }
  }, [interactive, reduceMotion, clickWrapControls]);

  // ---- Visibilités calculées par mood --------------------------------------
  const wingsVisible = mood === "flying" || miniFlyActive;
  const sparklesVisible = useMemo(
    () =>
      // Cachés sur warning, thinking, sleeping, sad.
      !["warning", "thinking", "sleeping", "sad"].includes(mood),
    [mood],
  );

  // ---- Animations par mood -------------------------------------------------
  const bodyVariants = useMemo<Variants>(
    () => buildBodyVariants(reduceMotion),
    [reduceMotion],
  );
  const bodyAnim = reduceMotion
    ? "static"
    : miniFlyActive
      ? "miniFly"
      : mood;

  // ---- JSX -----------------------------------------------------------------
  return (
    <>
      {!disableConfetti && <ConfettiBurst trigger={confettiTrigger} />}
      <div
        role={interactive ? "button" : "img"}
        aria-label={interactive ? "Clique sur la mascotte" : "Mascotte Sou'Sou"}
        tabIndex={interactive ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (interactive && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          "relative inline-block select-none",
          interactive &&
            "cursor-pointer focus:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 rounded-full",
          className,
        )}
        style={{ width: sizePx, height: sizePx }}
        data-mood={mood}
        data-interactive={interactive ? "true" : undefined}
      >
        {/* Ailes — z:0, derrière le corps. */}
        <motion.img
          src={`${PARTS_BASE}/wings.png`}
          alt=""
          draggable={false}
          loading="lazy"
          style={{ ...layerToStyle(layers.wings), zIndex: 0 }}
          animate={
            wingsVisible && !reduceMotion
              ? { opacity: 1, scaleX: [1, 0.85, 1] }
              : { opacity: wingsVisible ? 1 : 0, scaleX: 1 }
          }
          transition={
            wingsVisible
              ? {
                  scaleX: {
                    duration: 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                  opacity: { duration: 0.2 },
                }
              : { duration: 0.2 }
          }
        />

        {/* Wrap clic : reçoit les anims one-shot (jump/twist) via controls. */}
        <motion.div
          className="absolute inset-0"
          animate={clickWrapControls}
          style={{ originX: 0.5, originY: 0.5 }}
        >
          {/* Wrap mood : joue l'animation principale du mood. */}
          <motion.div
            className="absolute inset-0"
            variants={bodyVariants}
            animate={bodyAnim}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            {/* Corps */}
            <img
              src={`${PARTS_BASE}/body-base.png`}
              alt=""
              draggable={false}
              loading="lazy"
              style={{ ...layerToStyle(layers.body), zIndex: 1 }}
            />

            {/* Bras droit — porté à la "bouche" en thinking, pend en sad,
                agité en celebrating, écarté en flying. */}
            <motion.img
              src={`${PARTS_BASE}/arm-right.png`}
              alt=""
              draggable={false}
              loading="lazy"
              style={{
                ...layerToStyle(layers.armRight),
                zIndex: 2,
                transformOrigin: "0% 0%",
              }}
              animate={armRightAnim(mood, reduceMotion)}
              transition={armTransition(mood)}
            />

            {/* Bras gauche — salue en happy, levé "stop" en warning,
                thumbs-up figé en encouraging, pend en sad, écarté en flying. */}
            <motion.img
              src={`${PARTS_BASE}/arm-left.png`}
              alt=""
              draggable={false}
              loading="lazy"
              style={{
                ...layerToStyle(layers.armLeft),
                zIndex: 3,
                transformOrigin: "100% 0%",
              }}
              animate={armLeftAnim(mood, reduceMotion)}
              transition={armTransition(mood)}
            />

            {/* Yeux ouverts */}
            <img
              src={`${PARTS_BASE}/eyes-open.png`}
              alt=""
              draggable={false}
              loading="lazy"
              style={{
                ...layerToStyle(layers.eyes),
                zIndex: 4,
                opacity: eyesOpenOpacity,
                transition: "opacity 60ms linear",
              }}
            />
            {/* Yeux fermés (superposés) */}
            <img
              src={`${PARTS_BASE}/eyes-closed.png`}
              alt=""
              draggable={false}
              loading="lazy"
              style={{
                ...layerToStyle(layers.eyes),
                zIndex: 4,
                opacity: eyesClosedOpacity,
                transition: "opacity 60ms linear",
              }}
            />

            {/* Bouche — rebondit en thinking, retournée en sad. */}
            <motion.img
              src={`${PARTS_BASE}/mouth-smile.png`}
              alt=""
              draggable={false}
              loading="lazy"
              style={{
                ...layerToStyle(layers.mouth),
                zIndex: 5,
                transformOrigin: "50% 50%",
              }}
              animate={mouthAnim(mood, reduceMotion)}
              transition={mouthTransition(mood)}
            />

            {/* Pièce — vole en arc en celebrating + pendant le coinToss au clic. */}
            <motion.img
              key={`coin-${coinTossKey}`}
              src={`${PARTS_BASE}/coin.png`}
              alt=""
              draggable={false}
              loading="lazy"
              style={{ ...layerToStyle(layers.coin), zIndex: 6 }}
              animate={
                coinTossActive
                  ? {
                      y: [0, -45, -25, 0],
                      x: [0, -8, 4, 0],
                      rotate: [0, 360, 540, 720],
                    }
                  : mood === "celebrating" && !reduceMotion
                    ? {
                        y: [0, -40, -25, 0],
                        x: [0, 8, 4, 0],
                        rotate: [0, 360, 540, 720],
                      }
                    : { y: 0, x: 0, rotate: 0 }
              }
              transition={
                coinTossActive
                  ? { duration: 1, ease: "easeOut" }
                  : mood === "celebrating"
                    ? { duration: 1.5, repeat: Infinity, ease: "easeOut" }
                    : { duration: 0.3 }
              }
            />

            {/* Sparkle principal — rotation lente, pulse en encouraging. */}
            <motion.img
              src={`${PARTS_BASE}/sparkle.png`}
              alt=""
              draggable={false}
              loading="lazy"
              style={{
                ...layerToStyle(layers.sparkle),
                zIndex: 7,
                transformOrigin: "50% 50%",
                opacity: sparklesVisible ? 1 : 0,
                transition: "opacity 200ms linear",
              }}
              animate={
                !reduceMotion && sparklesVisible
                  ? mood === "encouraging"
                    ? { rotate: [0, 360], scale: [1, 1.2, 1] }
                    : { rotate: [0, 360] }
                  : { rotate: 0, scale: 1 }
              }
              transition={
                mood === "encouraging"
                  ? {
                      rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                      scale: {
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }
                  : { duration: 8, repeat: Infinity, ease: "linear" }
              }
            />

            {/* Extra-sparkles "happy" : 3 étincelles autour. */}
            <AnimatePresence>
              {mood === "happy" && !reduceMotion && (
                <>
                  <ExtraSparkle position={{ top: 5, left: 70 }} delay={0} />
                  <ExtraSparkle position={{ top: 60, left: 80 }} delay={0.5} />
                  <ExtraSparkle position={{ top: 30, left: 0 }} delay={1} />
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Effets globaux par mood (au-dessus du wrap mood, sans subir
            la transformation pour rester ancrés à la mascotte). */}
        {mood === "celebrating" && !reduceMotion && <CelebrationSparkles />}
        {mood === "flying" && !reduceMotion && <FlyingTrail />}
        {mood === "sleeping" && !reduceMotion && <SleepingZs />}

        {/* Sparkles burst au clic. */}
        {sparkleBurstActive && !reduceMotion && (
          <ClickSparkleBurst key={sparkleBurstKey} />
        )}
      </div>
    </>
  );
}

// =============================================================================
// Mini-burst au clic
// =============================================================================

const CLICK_BURST_POSITIONS: LayerPosition[] = [
  { top: 10, left: 50, translateX: -50 },
  { top: 30, left: -5 },
  { top: 30, left: 95 },
  { top: 60, left: 5 },
  { top: 60, left: 85 },
  { top: 85, left: 50, translateX: -50 },
];

function ClickSparkleBurst() {
  return (
    <>
      {CLICK_BURST_POSITIONS.map((pos, i) => (
        <ExtraSparkle key={i} position={pos} delay={i * 0.04} duration={1.0} />
      ))}
    </>
  );
}

// =============================================================================
// Variants & helpers d'animation
// =============================================================================

function buildBodyVariants(reduceMotion: boolean | null): Variants {
  if (reduceMotion) return { static: {} };

  return {
    static: {},
    miniFly: {
      // Override quand l'easter-egg du clic est actif.
      y: [-30, -25, -30],
      transition: { duration: 1, ease: "easeInOut" },
    },
    idle: {
      y: [0, -8, 0],
      transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
    },
    happy: {
      // 3 sauts puis pause de ~1s — boucle de 4.5 s.
      y: [0, -12, 0, -10, 0, -8, 0, 0, 0, 0],
      transition: {
        duration: 4.5,
        repeat: Infinity,
        ease: "easeOut",
        times: [0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.5, 0.7, 0.85, 1],
      },
    },
    celebrating: {
      // Saut + rotation 360°, puis petit rebond, puis pause idle.
      y: [0, -30, 0, -8, 0, 0, 0, 0],
      rotate: [0, 180, 360, 360, 360, 360, 360, 360],
      transition: {
        duration: 5,
        repeat: Infinity,
        times: [0, 0.1, 0.25, 0.32, 0.42, 0.6, 0.85, 1],
        ease: "easeInOut",
      },
    },
    warning: {
      // Tremblement bref puis flottement idle pour ne pas saouler.
      x: [0, -3, 3, -3, 3, -3, 3, -3, 0, 0, 0, 0],
      y: [0, 0, 0, 0, 0, 0, 0, 0, 0, -6, 0, 0],
      transition: {
        duration: 5,
        repeat: Infinity,
        times: [0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.4, 0.6, 0.85, 1],
        ease: "linear",
      },
    },
    encouraging: {
      // Flottement plus prononcé + tilt alternant ±2 deg.
      y: [0, -12, 0, -10, 0],
      rotate: [0, -2, 0, 2, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    thinking: {
      // Inclinaison lente gauche/droite (5s aller-retour).
      rotate: [0, 5, 0, -5, 0],
      transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
    },
    sleeping: {
      // Flottement très lent.
      y: [0, -4, 0],
      transition: { duration: 8, repeat: Infinity, ease: "easeInOut" },
    },
    sad: {
      y: 5,
      transition: { duration: 0.4 },
    },
    flying: {
      y: [-40, -32, -40],
      transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
    },
  };
}

function armRightAnim(
  mood: MascotMood,
  reduceMotion: boolean | null,
): Record<string, number | number[]> {
  if (reduceMotion) return { rotate: 0 };
  switch (mood) {
    case "thinking":
      // Porté à la "bouche" — translation vers le centre + rotation.
      return { rotate: -25, x: 12, y: -8 };
    case "sad":
      return { rotate: -30, y: 4 };
    case "celebrating":
      return { rotate: [0, 18, -12, 18, 0] };
    case "flying":
      return { rotate: 15 };
    default:
      return { rotate: 0, x: 0, y: 0 };
  }
}

function armLeftAnim(
  mood: MascotMood,
  reduceMotion: boolean | null,
): Record<string, number | number[]> {
  if (reduceMotion) return { rotate: 0 };
  switch (mood) {
    case "happy":
      return { rotate: [0, -18, 0, -10, 0] };
    case "warning":
      return { rotate: -32 };
    case "encouraging":
      // Thumbs-up figé "haut".
      return { rotate: -22 };
    case "sad":
      return { rotate: 28, y: 4 };
    case "celebrating":
      return { rotate: [0, -22, 12, -22, 0] };
    case "flying":
      return { rotate: -15 };
    default:
      return { rotate: 0, y: 0 };
  }
}

function armTransition(mood: MascotMood) {
  switch (mood) {
    case "happy":
      return { duration: 1.4, repeat: Infinity, ease: "easeInOut" } as const;
    case "celebrating":
      return { duration: 0.8, repeat: Infinity, ease: "easeInOut" } as const;
    default:
      return { duration: 0.4, ease: "easeOut" } as const;
  }
}

function mouthAnim(
  mood: MascotMood,
  reduceMotion: boolean | null,
): Record<string, number | number[]> {
  if (reduceMotion) return { rotate: 0, scaleY: 1 };
  switch (mood) {
    case "thinking":
      return { scaleY: [1, 0.9, 1], rotate: 0 };
    case "sad":
      // Bouche retournée + écrasée verticalement.
      return { rotate: 180, scaleY: 0.6 };
    default:
      return { rotate: 0, scaleY: 1 };
  }
}

function mouthTransition(mood: MascotMood) {
  if (mood === "thinking") {
    return { duration: 1.6, repeat: Infinity, ease: "easeInOut" } as const;
  }
  return { duration: 0.4, ease: "easeOut" } as const;
}
