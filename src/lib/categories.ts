// Group departments into clinical categories so the seat matrix can show
// colored accent bars and the user can scan more quickly.

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
    bar: "bg-teal-500",
    chip: "bg-teal-50 text-teal-800 ring-teal-100",
  },
  Surgery: {
    label: "Surgery",
    bar: "bg-navy-700",
    chip: "bg-slate-100 text-navy-800 ring-slate-200",
  },
  Gynae: {
    label: "Gynaecology",
    bar: "bg-rose-700",
    chip: "bg-rose-50 text-rose-700 ring-rose-100",
  },
  Paediatrics: {
    label: "Paediatrics",
    bar: "bg-amber-700",
    chip: "bg-amber-50 text-amber-800 ring-amber-100",
  },
  "Allied Specialty": {
    label: "Allied",
    bar: "bg-emerald-700",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  Diagnostic: {
    label: "Diagnostic",
    bar: "bg-slate-500",
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
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
