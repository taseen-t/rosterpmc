"use client";

import Marquee from "react-fast-marquee";

/**
 * The kinetic signature: two endless tickers, one screaming-fast on
 * the acid-yellow band, one steadier on rich-black underneath. They
 * never stop — that's the point. The dot dividers keep the rhythm even
 * during a hard browser repaint.
 */
export function LandingMarquees({
  stats,
  departments,
}: {
  stats: string[];
  departments: string[];
}) {
  return (
    <div className="border-y-2 border-[var(--border)]">
      {/* High-energy stats band on acid yellow */}
      <div className="bg-[var(--accent)] text-[var(--accent-foreground)] py-6 md:py-8">
        <Marquee speed={80} autoFill gradient={false} pauseOnHover={false}>
          {stats.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="inline-flex items-center font-display font-bold uppercase tracking-tighter text-3xl md:text-5xl lg:text-6xl px-6"
            >
              {s}
              <span className="mx-8 md:mx-12 opacity-80" aria-hidden>
                ●
              </span>
            </span>
          ))}
        </Marquee>
      </div>

      {/* Slower department ticker on black */}
      <div className="bg-[var(--background)] text-[var(--foreground)] py-5 md:py-6 border-t-2 border-[var(--border)]">
        <Marquee speed={40} autoFill gradient={false} pauseOnHover={false}>
          {departments.map((d, i) => (
            <span
              key={`${d}-${i}`}
              className="inline-flex items-center font-display font-bold uppercase tracking-tight text-lg md:text-2xl px-6"
            >
              {d}
              <span className="mx-6 md:mx-10 text-[var(--accent)]" aria-hidden>
                /
              </span>
            </span>
          ))}
        </Marquee>
      </div>
    </div>
  );
}
