"use client";

import { motion } from "framer-motion";

const nodes = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: 50 + 35 * Math.cos((2 * Math.PI * i) / 12),
  y: 50 + 35 * Math.sin((2 * Math.PI * i) / 12),
}));

const edges: [number, number][] = [];
for (let i = 0; i < nodes.length; i++) {
  edges.push([i, (i + 1) % nodes.length]);
  edges.push([i, (i + 4) % nodes.length]);
}

export default function AnalysisLoader() {
  return (
    <div className="loader-container">
      <svg viewBox="0 0 100 100" className="loader-svg">
        {/* Edges pulse */}
        {edges.map(([a, b], i) => (
          <motion.line
            key={`e-${i}`}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="rgba(99,102,241,0.2)"
            strokeWidth={0.4}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.6, 0] }}
            transition={{
              duration: 2,
              delay: i * 0.08,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
        {/* Nodes pulse */}
        {nodes.map((n) => (
          <motion.circle
            key={`n-${n.id}`}
            cx={n.x}
            cy={n.y}
            r={1.5}
            fill="#6366f1"
            initial={{ scale: 0.5, opacity: 0.3 }}
            animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.8,
              delay: n.id * 0.12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
      <motion.p
        className="loader-text"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Analyzing semantic fit...
      </motion.p>
    </div>
  );
}
