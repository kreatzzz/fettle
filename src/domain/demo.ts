/**
 * The dummy user: an account with two weeks of believable history, so the
 * app has something to show without signing up.
 */
import { presetEquipment, type Place } from "./equipment";
import { uid } from "./random";
import type { Meal, PrefStatus, Profile, Session, SessionExercise } from "./types";

const DAY = 86_400_000;

function at(daysAgo: number, hour: number, minute = 0) {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

type MealSeed = Omit<Meal, "id" | "at">;
const B: MealSeed[] = [
  { name: "Greek yogurt & berries", kind: "breakfast", kcal: 320, protein: 24, carbs: 38, fat: 7 },
  { name: "Oats with banana", kind: "breakfast", kcal: 410, protein: 14, carbs: 72, fat: 8 },
  { name: "Eggs on sourdough", kind: "breakfast", kcal: 450, protein: 26, carbs: 34, fat: 22 },
];
const L: MealSeed[] = [
  { name: "Chicken burrito bowl", kind: "lunch", kcal: 720, protein: 48, carbs: 82, fat: 20 },
  { name: "Turkey sandwich", kind: "lunch", kcal: 560, protein: 36, carbs: 58, fat: 18 },
  { name: "Salmon poke bowl", kind: "lunch", kcal: 640, protein: 38, carbs: 78, fat: 16 },
];
const S: MealSeed[] = [
  { name: "Protein shake", kind: "snack", kcal: 210, protein: 32, carbs: 9, fat: 4 },
  { name: "Apple & peanut butter", kind: "snack", kcal: 260, protein: 7, carbs: 28, fat: 16 },
];
const D: MealSeed[] = [
  { name: "Salmon, rice & greens", kind: "dinner", kcal: 680, protein: 42, carbs: 64, fat: 24 },
  { name: "Beef stir fry", kind: "dinner", kcal: 790, protein: 46, carbs: 76, fat: 30 },
  { name: "Pasta bolognese", kind: "dinner", kcal: 820, protein: 40, carbs: 96, fat: 26 },
];

function meals(days: number): Meal[] {
  const out: Meal[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const day = [B[d % 3], L[(d + 1) % 3], S[d % 2], D[(d + 2) % 3]];
    // Today: breakfast and lunch so far. Skip the snack on some days for variety.
    const list = d === 0 ? day.slice(0, 2) : d % 3 === 0 ? [day[0], day[1], day[3]] : day;
    const hours = [8, 13, 16, 20];
    list.forEach((m) => out.push({ ...m, id: uid(), at: at(d, hours[[B, L, S, D].findIndex((g) => g.includes(m))]) }));
  }
  return out;
}

const done = (n: number, reps: number, kg: number) => Array.from({ length: n }, () => ({ reps, weightKg: kg, done: true }));
const e = (exerciseId: string, n: number, reps: number, kg: number): SessionExercise => ({ exerciseId, sets: done(n, reps, kg) });

function sessions(placeId: string): Session[] {
  const s = (daysAgo: number, name: string, exercises: SessionExercise[]): Session => ({
    id: uid(),
    name,
    placeId,
    startedAt: at(daysAgo, 18, 0),
    finishedAt: at(daysAgo, 18, 52),
    exercises,
  });
  // Push / pull / legs over two weeks, loads creeping up so history shows progress.
  return [
    s(13, "Push day", [e("bench-press", 4, 6, 65), e("incline-db-press", 3, 10, 22), e("lateral-raise", 3, 14, 8), e("triceps-pushdown", 3, 12, 25)]),
    s(12, "Pull day", [e("pull-up", 4, 6, 0), e("barbell-row", 4, 8, 55), e("face-pull", 3, 15, 18), e("db-curl", 3, 12, 10)]),
    s(10, "Leg day", [e("back-squat", 4, 5, 90), e("rdl", 3, 8, 75), e("leg-curl", 3, 12, 35), e("calf-raise", 3, 15, 0)]),
    s(8, "Push day", [e("bench-press", 4, 6, 67.5), e("dips", 3, 10, 0), e("db-shoulder-press", 3, 10, 18), e("skull-crusher", 3, 12, 10)]),
    s(7, "Pull day", [e("lat-pulldown", 4, 10, 60), e("cable-row", 3, 10, 55), e("hammer-curl", 3, 10, 14), e("hanging-leg-raise", 3, 12, 0)]),
    s(5, "Leg day", [e("back-squat", 4, 5, 95), e("hip-thrust", 3, 10, 90), e("leg-extension", 3, 12, 45), e("plank", 3, 1, 0)]),
    s(3, "Upper body", [e("bench-press", 4, 6, 70), e("barbell-row", 4, 8, 60), e("db-shoulder-press", 3, 10, 20), e("db-curl", 3, 12, 12)]),
    s(1, "Push day", [e("incline-db-press", 4, 8, 26), e("dips", 3, 10, 0), e("lateral-raise", 4, 14, 9), e("cable-fly", 3, 12, 15)]),
    s(0, "Legs & core", [e("leg-press", 4, 10, 160), e("split-squat", 3, 8, 18), e("leg-extension", 3, 12, 50), e("ab-wheel", 3, 10, 0)]),
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
    kcalTarget: 2400,
    proteinTarget: 140,
    sessionMinutes: 45,
    memberSince: at(30, 9),
  };
  const prefs: Record<string, PrefStatus> = { "incline-db-press": "favorite", "pull-up": "favorite", "bulgarian-split-squat": "disliked" };
  return {
    onboarded: true,
    profile,
    places: [gym, home],
    activePlaceId: gym.id,
    meals: meals(14),
    sessions: sessions(gym.id),
    prefs,
    plan: { focus: "auto" as const, durationMin: 45, seed: 7, swaps: {} },
  };
}
