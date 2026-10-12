/** Input limits and parsing shared by every numeric field. */
export const LIMITS = {
  weightKg: { min: 30, max: 250, unit: 'kg' },
  heightCm: { min: 120, max: 230, unit: 'cm' },
  kcal: { min: 1, max: 5000, unit: 'kcal' },
  macro: { min: 0, max: 500, unit: 'g' },
  setKg: { min: 0, max: 500, unit: 'kg' },
  reps: { min: 0, max: 100, unit: 'reps' },
} as const;
export type Limit = (typeof LIMITS)[keyof typeof LIMITS];

export const NAME_MAX = 30;

/** Keep digits and one decimal separator (comma or dot), as typed. */
export function numericText(text: string, decimals = true) {
  const cleaned = text.replace(decimals ? /[^0-9.,]/g : /[^0-9]/g, '').replace(',', '.');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 1)}` : whole;
}

/** Parse a field against a limit. Empty is not an error; the caller decides if it's required. */
export function checkRange(text: string, limit: Limit): { value: number | null; error: string | null } {
  if (!text.trim()) return { value: null, error: null };
  const value = Number(text);
  if (!Number.isFinite(value)) return { value: null, error: 'Enter a number' };
  if (value < limit.min || value > limit.max) return { value: null, error: `Between ${limit.min} and ${limit.max} ${limit.unit}` };
  return { value, error: null };
}

export const clamp = (v: number, limit: Limit) => Math.min(limit.max, Math.max(limit.min, v));
