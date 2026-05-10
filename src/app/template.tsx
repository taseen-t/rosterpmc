"use client";

import { motion } from "motion/react";

/**
 * Per-route entrance animation. Next.js re-mounts a `template.tsx` on every
 * navigation (unlike `layout.tsx`), so each page fades + lifts in with a
 * spring on enter. The shared header/footer in layout.tsx stays mounted and
 * unaffected.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 26,
        mass: 0.9,
      }}
    >
      {children}
    </motion.div>
  );
}
