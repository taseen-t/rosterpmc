// Group departments into clinical categories so the seat matrix can show
// a quiet color accent and the user can scan more quickly. In the serif
// design system we lean on monochrome + a single gold accent, so these
// chips intentionally stay low-saturation.

export type Category =
  | "Medicine"
  | "Surgery"
  | "Gynae"
  | "Paediatrics"
  | "Allied Specialty"
  | "Diagnostic";

export const categoryStyle: Record<
  Category,
  { label: string; bar: string; chip: string }
> = {
  Medicine: {
    label: "Medicine",
    bar: "bg-[var(--accent)]",
    chip: "bg-[var(--accent-muted)]/40 text-[var(--accent)] border-[var(--accent)]/40",
  },
  Surgery: {
    label: "Surgery",
    bar: "bg-[var(--foreground)]",
    chip: "bg-[var(--muted)] text-[var(--foreground)] border-[var(--border-strong)]",
  },
  Gynae: {
    label: "Gynaecology",
    bar: "bg-[var(--rose)]",
    chip: "bg-[var(--rose-soft)] text-[var(--rose)] border-[var(--rose)]/30",
  },
  Paediatrics: {
    label: "Paediatrics",
    bar: "bg-[var(--amber)]",
    chip: "bg-[var(--amber-soft)] text-[var(--amber)] border-[var(--amber)]/30",
  },
  "Allied Specialty": {
    label: "Allied",
    bar: "bg-[var(--emerald)]",
    chip: "bg-[var(--emerald-soft)] text-[var(--emerald)] border-[var(--emerald)]/30",
  },
  Diagnostic: {
    label: "Diagnostic",
    bar: "bg-[var(--muted-foreground)]",
    chip: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border-strong)]",
  },
};

export function classify(name: string): Category {
  const n = name.toLowerCase();
  if (n.startsWith("medical unit")) return "Medicine";
  if (n.startsWith("surgical unit")) return "Surgery";
  if (n.startsWith("gynae")) return "Gynae";
  if (n.includes("paediatric")) return "Paediatrics";
  if (n.startsWith("radiology") || n.startsWith("radiotherapy")) return "Diagnostic";
  return "Allied Specialty";
}
