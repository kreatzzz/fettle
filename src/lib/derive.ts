/** Hooks that derive view data from the store. Nothing here is persisted. */
import { useMemo } from "react";
import { EXERCISE_BY_ID } from "@/domain/exercises";
import { loggedSets, muscleLoad, type FatigueLevel } from "@/domain/fatigue";
import { generateWorkout, type Draft } from "@/domain/generator";
import { MUSCLE_IDS, type MuscleId } from "@/domain/muscles";
import type { Meal } from "@/domain/types";
import { useActivePlace, useApp } from "@/store/app-store";
import { useNow } from "./clock";

const DAY = 86_400_000;

export function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function useLoggedSets() {
  const sessions = useApp((s) => s.sessions);
  return useMemo(() => loggedSets(sessions), [sessions]);
}

export function useFatigue() {
  const sets = useLoggedSets();
  const now = useNow();
  return useMemo(() => {
    const load = muscleLoad(sets, now);
    const levels = Object.fromEntries(MUSCLE_IDS.map((m) => [m, load[m].level])) as Record<MuscleId, FatigueLevel>;
    return { load, levels };
  }, [sets, now]);
}

export function useDraft(): Draft | null {
  const place = useActivePlace();
  const profile = useApp((s) => s.profile);
  const plan = useApp((s) => s.plan);
  const prefs = useApp((s) => s.prefs);
  const sets = useLoggedSets();
  const now = useNow();
  return useMemo(() => {
    if (!place || !profile) return null;
    const draft = generateWorkout({
      equipment: place.equipment,
      goal: profile.goal,
      experience: profile.experience,
      sets,
      prefs,
      now,
      durationMin: plan.durationMin,
      focus: plan.focus,
      seed: plan.seed,
    });
    const items = draft.items.map((it, i) => {
      const swap = plan.swaps[i];
      if (!swap || !EXERCISE_BY_ID.has(swap)) return it;
      return { ...it, exerciseId: swap, weightKg: 0, reason: "Swapped in by you" };
    });
    return { ...draft, items };
  }, [place, profile, plan, prefs, sets, now]);
}

export type Totals = { kcal: number; protein: number; carbs: number; fat: number };
export const sumMeals = (meals: Meal[]): Totals =>
  meals.reduce((t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat }), {
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

/** Today's meals and totals, plus calories for the last 7 days (oldest first). */
export function useNutrition() {
  const meals = useApp((s) => s.meals);
  const now = useNow();
  return useMemo(() => {
    const today = startOfDay(now);
    const todays = meals.filter((m) => Date.parse(m.at) >= today).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const week = Array.from({ length: 7 }, (_, i) => {
      const from = today - (6 - i) * DAY;
      return meals.filter((m) => {
        const t = Date.parse(m.at);
        return t >= from && t < from + DAY;
      });
    });
    return {
      todays,
      totals: sumMeals(todays),
      weekKcal: week.map((day) => sumMeals(day).kcal),
      weekLabels: Array.from({ length: 7 }, (_, i) => new Date(today - (6 - i) * DAY).toLocaleDateString(undefined, { weekday: "narrow" })),
    };
  }, [meals, now]);
}

/** Finished workouts newest first, with weekly counts and a streak in days. */
export function useTraining() {
  const sessions = useApp((s) => s.sessions);
  const now = useNow();
  return useMemo(() => {
    const finished = sessions.filter((s) => s.finishedAt).sort((a, b) => Date.parse(b.finishedAt!) - Date.parse(a.finishedAt!));
    const today = startOfDay(now);
    const weekSets = Array.from({ length: 7 }, (_, i) => {
      const from = today - (6 - i) * DAY;
      return finished
        .filter((s) => {
          const t = Date.parse(s.finishedAt!);
          return t >= from && t < from + DAY;
        })
        .reduce((n, s) => n + s.exercises.reduce((k, e) => k + e.sets.filter((x) => x.done).length, 0), 0);
    });
    const days = new Set(finished.map((s) => startOfDay(Date.parse(s.finishedAt!))));
    let streak = 0;
    // A streak survives a rest day: count back from today or yesterday.
    for (let d = days.has(today) ? today : today - DAY; days.has(d); d -= DAY) streak++;
    const volume = (s: (typeof finished)[number]) =>
      s.exercises.reduce((v, e) => v + e.sets.filter((x) => x.done).reduce((k, x) => k + x.reps * x.weightKg, 0), 0);
    return { finished, weekSets, streak, volume, thisWeek: finished.filter((s) => Date.parse(s.finishedAt!) >= today - 6 * DAY).length };
  }, [sessions, now]);
}

export function relativeDay(iso: string) {
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(Date.parse(iso))) / DAY);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return new Date(iso).toLocaleDateString(undefined, { weekday: "long" });
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Last 7 days as week tiles: sets trained and whether any food was logged. */
export function useWeekTiles() {
  const sessions = useApp((s) => s.sessions);
  const meals = useApp((s) => s.meals);
  const now = useNow();
  return useMemo(() => {
    const today = startOfDay(now);
    return Array.from({ length: 7 }, (_, i) => {
      const from = today - (6 - i) * DAY;
      const inDay = (iso: string) => {
        const t = Date.parse(iso);
        return t >= from && t < from + DAY;
      };
      const sets = sessions
        .filter((s) => s.finishedAt && inDay(s.finishedAt))
        .reduce((n, s) => n + s.exercises.reduce((k, e) => k + e.sets.filter((x) => x.done).length, 0), 0);
      return {
        label: new Date(from).toLocaleDateString(undefined, { weekday: "narrow" }),
        sets,
        ate: meals.some((m) => inDay(m.at)),
        today: i === 6,
      };
    });
  }, [sessions, meals, now]);
}
