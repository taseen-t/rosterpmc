"use client";

import { motion } from "motion/react";

/**
 * Per-route entrance animation. Kinetic style wants snap, not float —
 * 150ms hard ease, opacity only. No translate on the y-axis: it'd fight
 * the marquees that are already moving horizontally and read as jitter.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
