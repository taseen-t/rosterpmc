/**
 * The four-bars mark — one bar per three-month rotation. Top bar is the
 * acid-yellow accent so the eye lands there; the lower three are the
 * `bar` color (off-white in normal context, black when sitting on a
 * yellow surface).
 *
 * Single sized prop so we can use the same component in the header
 * (size=36) and inline in copy (size=20). Use the `tone` prop to flip
 * the bar color when the symbol is placed on a yellow background.
 */
export function LogoMark({
  size = 36,
  tone = "light",
  className,
}: {
  size?: number;
  tone?: "light" | "dark";
  className?: string;
}) {
  // bar = the "off" color; accent = always acid yellow.
  const bar = tone === "dark" ? "var(--background)" : "var(--foreground)";
  const accent = "var(--accent)";
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <rect x="2" y="6"  width="28" height="3.2" fill={accent} />
      <rect x="2" y="11" width="28" height="3.2" fill={bar} opacity="0.55" />
      <rect x="2" y="16" width="28" height="3.2" fill={bar} opacity="0.55" />
      <rect x="2" y="21" width="28" height="3.2" fill={bar} opacity="0.55" />
    </svg>
  );
}
