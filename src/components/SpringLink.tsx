"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { type ReactNode } from "react";

/**
 * A Link that gives a small spring scale on hover and a tighter scale on
 * tap, for primary CTAs that benefit from a tactile feel.
 */
export function SpringLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
}) {
  const inner = (
    <motion.span
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={className}
    >
      {children}
    </motion.span>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <Link href={href}>{inner}</Link>;
}
