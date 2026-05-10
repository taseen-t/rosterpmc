"use client";

import { motion } from "motion/react";

/**
 * Per-route entrance animation. Next.js re-mounts a `template.tsx` on every
 * navigation, so each page fades + lifts in. Tuned snappier (200ms,
 * iOS-style ease-out cubic) so navigation feels instant rather than
 * waiting on a spring.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
