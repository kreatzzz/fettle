import type Ionicons from '@expo/vector-icons/Ionicons';

import type { MealKind } from '@/domain/types';

export const MEAL_KINDS: { kind: MealKind; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: 'breakfast', label: 'Breakfast', icon: 'cafe-outline' },
  { kind: 'lunch', label: 'Lunch', icon: 'sunny-outline' },
  { kind: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { kind: 'snack', label: 'Snacks', icon: 'nutrition-outline' },
];

/** Meal slot that fits the current hour, used as the default when logging. */
export function kindForNow(): MealKind {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 17 ? 'snack' : 'dinner';
}
