/**
 * The dummy user: an account with four weeks of believable history, so the
 * app has something to show without signing up.
 */
import { presetEquipment, type Place } from "./equipment";
import { mulberry32, uid } from "./random";
import type { Meal, PrefStatus, Profile, Session, SessionExercise } from "./types";

const DAY = 86_400_000;

function atDate(day: Date, hour: number, minute = 0) {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function at(daysAgo: number, hour: number, minute = 0) {
  return atDate(new Date(Date.now() - daysAgo * DAY), hour, minute);
}

type MealSeed = Omit<Meal, "id" | "at">;
const B: MealSeed[] = [
  { name: "Greek yogurt & berries", kind: "breakfast", kcal: 320, protein: 24, carbs: 38, fat: 7 },
  { name: "Oats with banana", kind: "breakfast", kcal: 410, protein: 14, carbs: 72, fat: 8 },
  { name: "Eggs on sourdough", kind: "breakfast", kcal: 450, protein: 26, carbs: 34, fat: 22 },
  { name: "Protein pancakes", kind: "breakfast", kcal: 480, protein: 34, carbs: 56, fat: 13 },
  { name: "Cottage cheese & toast", kind: "breakfast", kcal: 380, protein: 28, carbs: 40, fat: 11 },
  { name: "Smoothie bowl", kind: "breakfast", kcal: 520, protein: 22, carbs: 74, fat: 15 },
];
const L: MealSeed[] = [
  { name: "Chicken burrito bowl", kind: "lunch", kcal: 720, protein: 48, carbs: 82, fat: 20 },
  { name: "Turkey sandwich", kind: "lunch", kcal: 560, protein: 36, carbs: 58, fat: 18 },
  { name: "Salmon poke bowl", kind: "lunch", kcal: 640, protein: 38, carbs: 78, fat: 16 },
  { name: "Tuna & quinoa salad", kind: "lunch", kcal: 610, protein: 42, carbs: 58, fat: 20 },
  { name: "Chicken wrap & fruit", kind: "lunch", kcal: 660, protein: 40, carbs: 70, fat: 22 },
  { name: "Lentil soup & bread", kind: "lunch", kcal: 540, protein: 24, carbs: 84, fat: 10 },
];
const S: MealSeed[] = [
  { name: "Protein shake", kind: "snack", kcal: 210, protein: 32, carbs: 9, fat: 4 },
  { name: "Apple & peanut butter", kind: "snack", kcal: 260, protein: 7, carbs: 28, fat: 16 },
  { name: "Cottage cheese & pineapple", kind: "snack", kcal: 190, protein: 20, carbs: 18, fat: 3 },
  { name: "Trail mix", kind: "snack", kcal: 300, protein: 9, carbs: 26, fat: 19 },
  { name: "Boiled eggs & fruit", kind: "snack", kcal: 230, protein: 15, carbs: 20, fat: 9 },
];
const D: MealSeed[] = [
  { name: "Salmon, rice & greens", kind: "dinner", kcal: 680, protein: 42, carbs: 64, fat: 24 },
  { name: "Beef stir fry", kind: "dinner", kcal: 790, protein: 46, carbs: 76, fat: 30 },
  { name: "Pasta bolognese", kind: "dinner", kcal: 820, protein: 40, carbs: 96, fat: 26 },
  { name: "Chicken curry & rice", kind: "dinner", kcal: 760, protein: 44, carbs: 88, fat: 22 },
  { name: "Steak, potatoes & broccoli", kind: "dinner", kcal: 840, protein: 50, carbs: 70, fat: 34 },
  { name: "Turkey chili", kind: "dinner", kcal: 620, protein: 46, carbs: 54, fat: 20 },
];
// Dessert-style extras for cheat days.
const X: MealSeed[] = [
  { name: "Dark chocolate brownie", kind: "snack", kcal: 340, protein: 4, carbs: 42, fat: 18 },
  { name: "Ice cream sundae", kind: "snack", kcal: 420, protein: 7, carbs: 58, fat: 18 },
  { name: "Cheesecake slice", kind: "snack", kcal: 460, protein: 8, carbs: 46, fat: 27 },
];
const HOUR: Record<Meal["kind"], number> = { breakfast: 8, lunch: 13, snack: 16, dinner: 20 };

/** Whole local calendar days since the epoch: one number per date. */
function dayKey(d: Date) {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
}

/** Local days from 27 days ago to 20 days ahead, plus all of this year's October. */
function coveredDays(today: Date): Date[] {
  const days = new Map<number, Date>();
  const add = (d: Date) => days.set(dayKey(d), d);
  for (let i = -27; i <= 20; i++) add(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  for (let day = 1; day <= 31; day++) add(new Date(today.getFullYear(), 9, day));
  return [...days.values()].sort((a, b) => a.getTime() - b.getTime());
}

/** Meals for one day. The day number seeds the randomness, so reloads give the same data. */
function dayMeals(day: Date, isToday: boolean): Meal[] {
  const key = dayKey(day);
  const rng = mulberry32(key);
  const cheat = key % 9 === 4; // extra dessert and the heaviest dinner
  const light = key % 7 === 3; // lower calorie target
  const threeMeals = key % 11 === 5; // no snack
  const list: MealSeed[] = [B[key % B.length], L[(key + 1) % L.length], D[cheat ? 4 : (key + 2) % D.length]];
  if (!threeMeals) list.push(S[key % S.length]);
  if (cheat) list.push(X[key % X.length]);

  // Scale portions to a per-day calorie target, keeping protein within 100-165 g.
  const target = cheat ? 2450 + rng() * 200 : light ? 1820 + rng() * 140 : 1980 + rng() * 300;
  const sum = (k: "kcal" | "protein") => list.reduce((t, m) => t + m[k], 0);
  const f = Math.min(Math.max(target / sum("kcal"), 100 / sum("protein")), 165 / sum("protein"));

  return list
    .filter((m) => !isToday || m.kind === "breakfast" || m.kind === "lunch")
    .map((m) => ({
      ...m,
      kcal: Math.round(m.kcal * f),
      protein: Math.round(m.protein * f),
      carbs: Math.round(m.carbs * f),
      fat: Math.round(m.fat * f),
      id: uid(),
      at: atDate(day, HOUR[m.kind], Math.floor(rng() * 45)),
    }));
}

/** Every covered day, oldest first. Today only has breakfast and lunch logged. */
function demoMeals(): Meal[] {
  const today = new Date();
  const todayKey = dayKey(today);
  return coveredDays(today).flatMap((day) => dayMeals(day, dayKey(day) === todayKey));
}

const done = (n: number, reps: number, kg: number) => Array.from({ length: n }, () => ({ reps, weightKg: kg, done: true }));
const e = (exerciseId: string, n: number, reps: number, kg: number): SessionExercise => ({ exerciseId, sets: done(n, reps, kg) });

function sessions(gymId: string, homeId: string): Session[] {
  const s = (daysAgo: number, name: string, placeId: string, minutes: number, exercises: SessionExercise[]): Session => {
    const startedAt = at(daysAgo, 18, 0);
    return {
      id: uid(),
      name,
      placeId,
      startedAt,
      finishedAt: new Date(Date.parse(startedAt) + minutes * 60_000).toISOString(),
      exercises,
    };
  };
  // Push / pull / legs / upper over four weeks. Loads creep up ~2-3% a week,
  // with a slightly lighter stretch in the middle. Home sessions use dumbbells,
  // bench, bands and pull-up bar only.
  return [
    s(27, "Push day", gymId, 52, [e("bench-press", 4, 6, 60), e("incline-db-press", 3, 10, 20), e("lateral-raise", 3, 14, 8), e("triceps-pushdown", 3, 12, 22.5)]),
    s(25, "Pull day", gymId, 58, [e("pull-up", 4, 6, 0), e("barbell-row", 4, 8, 50), e("face-pull", 3, 15, 15), e("db-curl", 3, 12, 10)]),
    s(23, "Leg day", gymId, 64, [e("back-squat", 4, 5, 85), e("rdl", 3, 8, 70), e("leg-curl", 3, 12, 32.5), e("calf-raise", 3, 15, 0)]),
    s(22, "Home: full body", homeId, 48, [e("goblet-squat", 3, 10, 20), e("db-bench", 3, 10, 20), e("db-row", 3, 10, 20), e("dead-bug", 3, 10, 0)]),
    s(20, "Push day", gymId, 55, [e("bench-press", 4, 6, 62.5), e("incline-db-press", 3, 10, 20), e("lateral-raise", 3, 14, 8), e("triceps-pushdown", 3, 12, 25)]),
    s(18, "Pull day", gymId, 50, [e("pull-up", 4, 7, 0), e("barbell-row", 4, 8, 52.5), e("face-pull", 3, 15, 15), e("hammer-curl", 3, 12, 10)]),
    s(16, "Leg day", gymId, 62, [e("back-squat", 4, 5, 87.5), e("rdl", 3, 8, 72.5), e("leg-curl", 3, 12, 35), e("calf-raise", 4, 12, 0)]),
    s(15, "Upper body", gymId, 57, [e("bench-press", 4, 6, 60), e("barbell-row", 4, 8, 50), e("db-shoulder-press", 3, 10, 18), e("db-curl", 3, 12, 10)]),
    s(13, "Push day", gymId, 46, [e("bench-press", 4, 6, 60), e("incline-db-press", 3, 10, 20), e("lateral-raise", 3, 14, 8), e("triceps-pushdown", 3, 12, 22.5)]),
    s(11, "Home: full body", homeId, 51, [e("goblet-squat", 3, 10, 20), e("db-bench", 3, 10, 20), e("pull-up", 3, 6, 0), e("db-row", 3, 10, 20)]),
    s(9, "Leg day", gymId, 61, [e("back-squat", 4, 5, 85), e("rdl", 3, 8, 70), e("leg-curl", 3, 12, 32.5), e("calf-raise", 3, 15, 0)]),
    s(8, "Upper body", gymId, 45, [e("bench-press", 4, 5, 65), e("barbell-row", 4, 8, 52.5), e("db-shoulder-press", 3, 10, 18), e("db-curl", 3, 12, 10)]),
    s(6, "Push day", gymId, 59, [e("bench-press", 4, 6, 65), e("incline-db-press", 3, 10, 22), e("lateral-raise", 3, 14, 9), e("triceps-pushdown", 3, 12, 25)]),
    s(4, "Home: full body", homeId, 49, [e("goblet-squat", 3, 10, 22.5), e("push-up", 3, 12, 0), e("pull-up", 4, 7, 0), e("db-curl", 3, 12, 12)]),
    s(2, "Leg day", gymId, 65, [e("back-squat", 4, 5, 90), e("rdl", 3, 8, 75), e("leg-curl", 3, 12, 35), e("calf-raise", 3, 15, 0)]),
    s(1, "Upper body", gymId, 53, [e("bench-press", 4, 5, 67.5), e("barbell-row", 4, 8, 55), e("db-shoulder-press", 3, 10, 20), e("db-curl", 3, 12, 12)]),
  ];
}

/** Full AppData for the demo account. */
export function demoAccount() {
  const gym: Place = { id: uid(), name: "Iron Works Gym", kind: "gym", equipment: [...presetEquipment("gym"), "ab-wheel"] };
  const home: Place = { id: uid(), name: "Home", kind: "home", equipment: ["dumbbells", "bench", "bands", "pull-up-bar"] };
  const profile: Profile = {
    name: "Sam",
    goal: "muscle",
    experience: "regular",
    weightKg: 76,
    heightCm: 178,
    weeklyWorkouts: 4,
    kcalTarget: 2200,
    proteinTarget: 140,
    sessionMinutes: 45,
    memberSince: at(45, 9),
  };
  const prefs: Record<string, PrefStatus> = {
    "incline-db-press": "favorite",
    "pull-up": "favorite",
    "split-squat": "disliked",
    "bench-press": "favorite",
    "walking-lunge": "disliked",
  };
  return {
    onboarded: true,
    profile,
    places: [gym, home],
    activePlaceId: gym.id,
    meals: demoMeals(),
    sessions: sessions(gym.id, home.id),
    prefs,
    plan: { focus: "auto" as const, durationMin: 45, seed: 7, swaps: {} },
  };
}
