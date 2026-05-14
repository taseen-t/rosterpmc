// Group departments into clinical categories so the seat matrix can show
// a colored accent and a flat soft-tint chip. Categories use a small,
// disciplined palette built around the design system's blue/emerald/
// amber/gray-900 with rose for Gynae as the one outlier (visible across
// the system's neutrals).

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
    bar: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700",
  },
  Surgery: {
    label: "Surgery",
    bar: "bg-gray-900",
    chip: "bg-gray-100 text-gray-900",
  },
  Gynae: {
    label: "Gynaecology",
    bar: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700",
  },
  Paediatrics: {
    label: "Paediatrics",
    bar: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700",
  },
  "Allied Specialty": {
    label: "Allied",
    bar: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700",
  },
  Diagnostic: {
    label: "Diagnostic",
    bar: "bg-gray-400",
    chip: "bg-gray-100 text-gray-600",
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
