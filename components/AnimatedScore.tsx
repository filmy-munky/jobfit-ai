"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Props {
  score: number;
}

export default function AnimatedScore({ score }: Props) {
  const [displayed, setDisplayed] = useState(0);
  const radius = 80;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 100;

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      onUpdate: (v) => setDisplayed(Math.round(v)),
    });
    return () => controls.stop();
  }, [score]);

  const color =
    score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const colorGlow =
    score >= 70 ? "rgba(16,185,129,0.3)" : score >= 40 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)";

  return (
    <div className="score-gauge">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {/* Track */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <motion.circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            filter: `drop-shadow(0 0 12px ${colorGlow})`,
          }}
        />
      </svg>
      <div className="score-value" style={{ color }}>
        {displayed}
      </div>
      <div className="score-label">fit score</div>
    </div>
  );
}
