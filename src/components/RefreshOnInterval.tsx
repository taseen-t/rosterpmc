"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the server every `intervalMs` (default 20s) by calling
 * router.refresh() so the blocker banner updates when the higher-ranked
 * student finally submits.
 */
export function RefreshOnInterval({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
