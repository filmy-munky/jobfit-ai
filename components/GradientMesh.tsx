"use client";

/**
 * Animated gradient mesh background — CSS-only, GPU-accelerated.
 * Inspired by Lusion.co and kprverse.com orb effects.
 */
export default function GradientMesh() {
  return (
    <div className="gradient-mesh" aria-hidden>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />
      <div className="noise" />
    </div>
  );
}
