"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const COLORS = [
  "#10B981",
  "#34D399",
  "#FC7C78",
  "#FDA4A0",
  "#FBBF24",
  "#1E293B",
  "#FFFFFF",
];

interface Particle {
  id: number;
  x: number; // % horizontal start (around center)
  vx: number; // px target offset
  vy: number;
  rot: number;
  size: number;
  color: string;
  delay: number;
  shape: "square" | "circle";
}

function generateParticles(count: number, seed: number): Particle[] {
  // pseudo-random based on seed for deterministic re-runs
  let s = seed;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  return Array.from({ length: count }, (_, i) => {
    const angle = rng() * Math.PI * 2;
    const distance = 180 + rng() * 220;
    return {
      id: i,
      x: 50,
      vx: Math.cos(angle) * distance,
      vy: Math.sin(angle) * distance - 100, // bias upward
      rot: rng() * 720 - 360,
      size: 6 + rng() * 8,
      color: COLORS[Math.floor(rng() * COLORS.length)],
      delay: rng() * 0.15,
      shape: rng() > 0.5 ? "square" : "circle",
    };
  });
}

/**
 * Confettis plein écran, déclenchés à chaque incrément de `trigger`.
 * Render uniquement quand actif pour éviter le coût.
 */
export function ConfettiBurst({ trigger }: { trigger: number }) {
  const [active, setActive] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger <= 0) return;
    setParticles(generateParticles(60, trigger));
    setActive(true);
    const t = setTimeout(() => setActive(false), 2500);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: 0,
            y: 0,
            opacity: 1,
            rotate: 0,
            scale: 0.6,
          }}
          animate={{
            x: p.vx,
            y: p.vy + 360, // gravity drop
            opacity: 0,
            rotate: p.rot,
            scale: 1,
          }}
          transition={{
            duration: 1.6,
            delay: p.delay,
            ease: [0.2, 0.7, 0.6, 1],
          }}
          style={{
            position: "absolute",
            top: "45%",
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : 2,
          }}
        />
      ))}
    </div>
  );
}
