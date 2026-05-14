/**
 * The four-bars mark — one bar per three-month rotation. Top bar in the
 * primary blue (action color), the lower three in a muted gray so the
 * eye lands on rotation #1 first.
 *
 * Use the `tone` prop to flip when the mark is placed on a colored
 * surface: "dark" inverts to white bars + blue accent for use on the
 * dark footer / blue hero.
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
  const accent = "var(--primary)";
  const bar = tone === "dark" ? "var(--dark-foreground)" : "#9CA3AF"; // gray-400 on light
  const opacity = tone === "dark" ? 0.55 : 1;
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <rect x="2" y="6"  width="28" height="3.4" rx="1.2" fill={accent} />
      <rect x="2" y="11" width="28" height="3.4" rx="1.2" fill={bar} opacity={opacity} />
      <rect x="2" y="16" width="28" height="3.4" rx="1.2" fill={bar} opacity={opacity} />
      <rect x="2" y="21" width="28" height="3.4" rx="1.2" fill={bar} opacity={opacity} />
    </svg>
  );
}
