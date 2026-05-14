// Group departments into clinical categories so the seat matrix can show
// an accent bar and the user can scan more quickly. In the kinetic design
// system we stay close to the monochrome + acid-yellow palette — most
// categories use neutrals, with the accent reserved for "Medicine" since
// that's the family the public asks about first.

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
    chip: "border-[var(--accent)] text-[var(--accent)] bg-transparent",
  },
  Surgery: {
    label: "Surgery",
    bar: "bg-[var(--foreground)]",
    chip: "border-[var(--foreground)] text-[var(--foreground)] bg-transparent",
  },
  Gynae: {
    label: "Gynaecology",
    bar: "bg-[var(--rose)]",
    chip: "border-[var(--rose)] text-[var(--rose)] bg-transparent",
  },
  Paediatrics: {
    label: "Paediatrics",
    bar: "bg-[var(--amber)]",
    chip: "border-[var(--amber)] text-[var(--amber)] bg-transparent",
  },
  "Allied Specialty": {
    label: "Allied",
    bar: "bg-[var(--emerald)]",
    chip: "border-[var(--emerald)] text-[var(--emerald)] bg-transparent",
  },
  Diagnostic: {
    label: "Diagnostic",
    bar: "bg-[var(--muted-foreground)]",
    chip: "border-[var(--muted-foreground)] text-[var(--muted-foreground)] bg-transparent",
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
