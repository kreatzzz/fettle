/**
 * Builds a workout draft from the equipment at a place and muscle readiness.
 * Pure: same inputs and seed give the same draft. The result is a preview the
 * user reviews and starts; it never touches history.
 */
import { EXERCISES, EXERCISE_BY_ID, isAvailable, type Exercise, type MovementPattern } from "./exercises";
import { muscleLoad, type LoggedSet, type MuscleState } from "./fatigue";
import { MUSCLES, type MuscleId } from "./muscles";
import { mulberry32 } from "./random";
import type { Experience, Goal, PrefStatus } from "./types";

export type Focus = "auto" | "upper" | "lower" | "full";
/** What the session is built for. "fat-loss" is a coach-requested circuit: full body, more reps, short rests. */
export type WorkoutGoal = Goal | "fat-loss";

export type DraftItem = { exerciseId: string; sets: number; reps: number; restSeconds: number; weightKg: number; reason: string };
export type Draft = { name: string; focus: Exclude<Focus, "auto">; items: DraftItem[]; skipped: string[] };

type Input = {
  equipment: readonly string[];
  goal: WorkoutGoal;
  experience: Experience;
  sets: LoggedSet[];
  prefs: Record<string, PrefStatus>;
  now: number;
  durationMin: number;
  focus: Focus;
  seed: number;
};

const SLOTS: Record<Exclude<Focus, "auto">, MovementPattern[]> = {
  full: ["squat", "push", "pull", "hinge", "isolation", "core", "lunge", "isolation"],
  upper: ["push", "pull", "push", "pull", "isolation", "isolation", "core", "isolation"],
  lower: ["squat", "hinge", "lunge", "isolation", "core", "isolation", "squat", "core"],
};

const DOSE: Record<WorkoutGoal, { sets: number; reps: number; rest: number }> = {
  strength: { sets: 4, reps: 5, rest: 150 },
  muscle: { sets: 3, reps: 10, rest: 90 },
  general: { sets: 3, reps: 12, rest: 60 },
  "fat-loss": { sets: 3, reps: 15, rest: 30 },
};

const readiness = (s: MuscleState) => Math.max(0, Math.min(1, 1 - s.ratio));

function avgReadiness(muscles: MuscleId[], load: Record<MuscleId, MuscleState>) {
  if (!muscles.length) return 1;
  return muscles.reduce((sum, m) => sum + readiness(load[m]), 0) / muscles.length;
}

function pickFocus(load: Record<MuscleId, MuscleState>): Exclude<Focus, "auto"> {
  const group = (g: "upper" | "lower") => avgReadiness((Object.keys(MUSCLES) as MuscleId[]).filter((m) => MUSCLES[m].group === g), load);
  const upper = group("upper");
  const lower = group("lower");
  if (Math.abs(upper - lower) < 0.12) return "full";
  return upper > lower ? "upper" : "lower";
}

function lastWeight(sets: LoggedSet[], exerciseId: string) {
  for (let i = sets.length - 1; i >= 0; i--) if (sets[i].exerciseId === exerciseId) return sets[i].weightKg;
  return 0;
}

function reasonFor(e: Exercise, load: Record<MuscleId, MuscleState>) {
  const m = e.primary[0];
  const state = ["fresh", "mostly recovered", "room for a bit more", "room for a bit more"][load[m].level];
  const gear = e.equipment.length ? e.equipment.map((id) => id.replace(/-/g, " ")).join(", ") : "no equipment";
  return `${MUSCLES[m].label}: ${state} · ${gear}`;
}

/** Bodyweight moves can't be loaded heavier, so low-rep strength doses become 10+ reps. */
function bodyweightDose(e: Exercise, item: DraftItem): DraftItem {
  if (e.equipment.length || item.reps >= 10) return item;
  return { ...item, reps: 10, restSeconds: Math.min(item.restSeconds, 90) };
}

export function generateWorkout(input: Input): Draft {
  const load = muscleLoad(input.sets, input.now);
  const focus = input.focus === "auto" ? (input.goal === "fat-loss" ? "full" : pickFocus(load)) : input.focus;
  const slotCount = Math.max(3, Math.min(8, Math.round(input.durationMin / 8)));
  const slots = SLOTS[focus].slice(0, slotCount);
  const rand = mulberry32(input.seed);
  const lastSessionIds = new Set(input.sets.slice(-20).map((s) => s.exerciseId));
  const dose = DOSE[input.goal];
  const used = new Set<string>();
  const items: DraftItem[] = [];
  const skipped: string[] = [];

  for (const pattern of slots) {
    const candidates = EXERCISES.filter(
      (e) =>
        e.pattern === pattern &&
        !used.has(e.id) &&
        input.prefs[e.id] !== "blocked" &&
        isAvailable(e, input.equipment) &&
        (focus === "full" || e.primary.some((m) => MUSCLES[m].group === focus || MUSCLES[m].group === "core")),
    );
    const scored = candidates
      .map((e) => {
        const r = avgReadiness(e.primary, load);
        const pref = input.prefs[e.id] === "favorite" ? 3 : input.prefs[e.id] === "disliked" ? -6 : 0;
        // Spread work: penalize exercises whose primary muscle is already in the draft.
        const overlap = items.some((it) => EXERCISE_BY_ID.get(it.exerciseId)?.primary[0] === e.primary[0]) ? -4 : 0;
        // Loaded variants beat bodyweight ones when the gear exists.
        const loaded = !e.equipment.length ? 0 : e.equipment.includes("bands") ? 0.5 : 1.5;
        return { e, r, score: r * 10 + pref + overlap + loaded - (lastSessionIds.has(e.id) ? 2 : 0) + rand() * 2.5 };
      })
      .filter((c) => c.r >= 0.3)
      .sort((a, b) => b.score - a.score);
    const pick = scored[0]?.e;
    if (!pick) {
      skipped.push(pattern === "hinge" ? "Hamstrings: no hinge fits this equipment or they need rest" : `No ${pattern} exercise fits right now`);
      continue;
    }
    used.add(pick.id);
    items.push(
      bodyweightDose(pick, {
        exerciseId: pick.id,
        sets: Math.max(2, dose.sets - (input.experience === "new" ? 1 : 0) - (pick.pattern === "isolation" || pick.pattern === "core" ? 1 : 0)),
        reps: pick.pattern === "core" ? 12 : pick.pattern === "isolation" ? Math.max(dose.reps, 10) : dose.reps,
        restSeconds: pick.pattern === "isolation" || pick.pattern === "core" ? 60 : dose.rest,
        weightKg: lastWeight(input.sets, pick.id),
        reason: reasonFor(pick, load),
      }),
    );
  }

  const names = { full: "Full body", upper: "Upper body", lower: "Lower body" } as const;
  const name = input.goal === "fat-loss" ? (focus === "full" ? "Fat-loss circuit" : `${names[focus]} fat-loss`) : names[focus];
  return { name, focus, items, skipped };
}

/** Up to `limit` swaps: same pattern, shares the first primary muscle, available, not blocked. */
export function alternatives(
  exerciseId: string,
  equipment: readonly string[],
  prefs: Record<string, PrefStatus>,
  exclude: string[] = [],
  limit = 3,
) {
  const original = EXERCISE_BY_ID.get(exerciseId);
  if (!original) return [];
  return EXERCISES.filter(
    (e) =>
      e.id !== exerciseId &&
      !exclude.includes(e.id) &&
      (e.pattern === original.pattern || e.primary.includes(original.primary[0])) &&
      e.primary.some((m) => original.primary.includes(m)) &&
      isAvailable(e, equipment) &&
      prefs[e.id] !== "blocked",
  )
    .sort((a, b) => {
      const shared = (e: Exercise) => e.primary.filter((m) => original.primary.includes(m)).length;
      const pref = (e: Exercise) => (prefs[e.id] === "favorite" ? 1 : prefs[e.id] === "disliked" ? -1 : 0);
      return shared(b) - shared(a) || pref(b) - pref(a);
    })
    .slice(0, limit);
}

/** Exercises that train `m` and are available, primary movers first. */
export function exercisesFor(m: MuscleId, equipment: readonly string[], limit = 4) {
  return EXERCISES.filter((e) => (e.primary.includes(m) || e.secondary.includes(m)) && isAvailable(e, equipment))
    .sort((a, b) => Number(b.primary.includes(m)) - Number(a.primary.includes(m)))
    .slice(0, limit);
}
