import type { EquipmentId, Place } from "./equipment";

export type { Place, EquipmentId };

export type SetEntry = { reps: number; weightKg: number; done: boolean };
export type SessionExercise = { exerciseId: string; sets: SetEntry[]; reason?: string };

/** A workout. Starting one copies the plan in, so later plan edits never alter history. */
export type Session = {
  id: string;
  name: string;
  placeId: string;
  startedAt: string; // ISO
  finishedAt?: string; // unset while in progress
  exercises: SessionExercise[];
};

export type MealKind = "breakfast" | "lunch" | "dinner" | "snack";
export type Meal = {
  id: string;
  name: string;
  kind: MealKind;
  at: string; // ISO
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Goal = "strength" | "muscle" | "general";
export type Experience = "new" | "regular";
export type Activity = "sedentary" | "light" | "moderate" | "very";

export type Profile = {
  name: string;
  goal: Goal;
  experience: Experience;
  weightKg?: number;
  heightCm?: number;
  activity?: Activity;
  /** Target workouts per week; drives the Today ring. */
  weeklyWorkouts?: number;
  kcalTarget: number;
  proteinTarget: number;
  sessionMinutes: number;
  memberSince: string; // ISO
};

export type PrefStatus = "favorite" | "disliked" | "blocked";
