"use client";

import { motion } from "framer-motion";

type Coverage = "strong" | "weak" | "missing";

interface Props {
  requirement: string;
  bestSentence: string | null;
  score: number;
  coverage: Coverage;
  index: number;
}

const coverageConfig = {
  strong: {
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    pill: "#10b981",
    pillBg: "rgba(16,185,129,0.15)",
    label: "STRONG MATCH",
  },
  weak: {
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.2)",
    pill: "#f59e0b",
    pillBg: "rgba(245,158,11,0.12)",
    label: "PARTIAL",
  },
  missing: {
    bg: "rgba(239,68,68,0.05)",
    border: "rgba(239,68,68,0.18)",
    pill: "#ef4444",
    pillBg: "rgba(239,68,68,0.12)",
    label: "GAP",
  },
};

export default function RequirementCard({
  requirement,
  bestSentence,
  score,
  coverage,
  index,
}: Props) {
  const c = coverageConfig[coverage];

  return (
    <motion.div
      className="req-card"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      style={{
        background: c.bg,
        borderColor: c.border,
      }}
    >
      <div className="req-header">
        <span
          className="coverage-pill"
          style={{ color: c.pill, background: c.pillBg }}
        >
          {c.label}
        </span>
        <span className="req-score" style={{ color: c.pill }}>
          {(score * 100).toFixed(0)}%
        </span>
      </div>
      <p className="req-text">{requirement}</p>
      {bestSentence && coverage !== "missing" && (
        <motion.p
          className="req-match"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.06 + 0.3 }}
        >
          <span className="match-icon">↳</span> {bestSentence}
        </motion.p>
      )}
      {/* Similarity bar */}
      <div className="sim-bar-track">
        <motion.div
          className="sim-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score * 100, 100)}%` }}
          transition={{
            duration: 0.8,
            delay: index * 0.06 + 0.2,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
          style={{ background: c.pill }}
        />
      </div>
    </motion.div>
  );
}
