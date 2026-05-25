"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

/**
 * Anneau de progression SVG. La barre se remplit de 0 → progress (0..1)
 * avec un spring smooth.
 */
export function ProgressRing({
  progress,
  size = 200,
  strokeWidth = 14,
  trackColor = "rgba(255,255,255,0.15)",
  barColor = "url(#sousou-progress-gradient)",
  showGradientDefs = true,
  children,
}: {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  barColor?: string;
  showGradientDefs?: boolean;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const target = Math.max(0, Math.min(1, progress));
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 18 });
  const dashOffset = useTransform(spring, (v) => circumference * (1 - v));

  useEffect(() => {
    mv.set(target);
  }, [target, mv]);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {showGradientDefs && (
          <defs>
            <linearGradient
              id="sousou-progress-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={barColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
