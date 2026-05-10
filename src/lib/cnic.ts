/** Format a digit string into Pakistani CNIC layout: 5-7-1.
 *  Pure client-safe helper — no server imports. */
export function formatCnic(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/** Pull the 13 digits out of any user input and format them canonically.
 *  Returns null if not exactly 13 digits. */
export function normalizeCnic(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.length !== 13) return null;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}
