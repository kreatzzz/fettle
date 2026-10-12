/**
 * Muscle fatigue, derived from logged sets on demand (never stored), so it can't
 * drift from history. Heuristic, not physiology: the UI always says "estimated".
 *
 *   stimulus = role (1 primary, 0.5 secondary)
 *   load(m)  = Σ stimulus × 0.5 ^ (hoursAgo / halfLife(m))     over the last 7 days
 *   ratio(m) = load / weeklySetsHigh(m)
 */
import { EXERCISE_BY_ID } from "./exercises";
import { MUSCLES, MUSCLE_IDS, type MuscleId } from "./muscles";
import type { Session } from "./types";

export type FatigueLevel = 0 | 1 | 2 | 3;
export const LEVEL_LABELS = ["Ready", "Ready", "Recovering", "Needs rest"] as const;

export type MuscleState = {
  ratio: number;
  level: FatigueLevel;
  load: number;
  setsLast7d: number; // weighted: secondary sets count 0.5
  lastTrainedAt?: string;
  recoveredInHours: number; // until it reads Fresh again; 0 when already fresh
};

export type LoggedSet = { sessionId: string; exerciseId: string; at: number; reps: number; weightKg: number };

const HOUR = 3_600_000;
const WINDOW_MS = 7 * 24 * HOUR;
const FRESH_BELOW = 0.15;

export function levelFor(ratio: number): FatigueLevel {
  if (ratio < FRESH_BELOW) return 0;
  if (ratio < 0.4) return 1;
  if (ratio < 0.75) return 2;
  return 3;
}

/** Completed sets of finished sessions, oldest first. Sets in one session share its finish time. */
export function loggedSets(sessions: Session[]): LoggedSet[] {
  const out: LoggedSet[] = [];
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    const at = Date.parse(s.finishedAt);
    for (const e of s.exercises) {
      for (const set of e.sets) {
        if (set.done) out.push({ sessionId: s.id, exerciseId: e.exerciseId, at, reps: set.reps, weightKg: set.weightKg });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

function role(exerciseId: string, m: MuscleId) {
  const e = EXERCISE_BY_ID.get(exerciseId);
  if (!e) return 0;
  if (e.primary.includes(m)) return 1;
  if (e.secondary.includes(m)) return 0.5;
  return 0;
}

export function muscleLoad(sets: LoggedSet[], now: number): Record<MuscleId, MuscleState> {
  const result = {} as Record<MuscleId, MuscleState>;
  for (const m of MUSCLE_IDS) {
    const { halfLifeHours, weeklySetsHigh } = MUSCLES[m];
    let load = 0;
    let count = 0;
    let last: number | undefined;
    for (const set of sets) {
      // Clamp: a set logged after `now` was sampled counts as just done.
      const age = Math.max(0, now - set.at);
      if (age > WINDOW_MS) continue;
      const r = role(set.exerciseId, m);
      if (!r) continue;
      load += r * 0.5 ** (age / HOUR / halfLifeHours);
      count += r;
      last = Math.max(last ?? 0, set.at);
    }
    const ratio = load / weeklySetsHigh;
    const freshLoad = FRESH_BELOW * weeklySetsHigh;
    result[m] = {
      ratio,
      level: levelFor(ratio),
      load,
      setsLast7d: count,
      lastTrainedAt: last ? new Date(last).toISOString() : undefined,
      recoveredInHours: load > freshLoad ? Math.ceil(halfLifeHours * Math.log2(load / freshLoad)) : 0,
    };
  }
  return result;
}

/** Sets that hit muscle `m` per day for the last `days` days (oldest first), weighted by role. */
export function dailySets(sets: LoggedSet[], m: MuscleId, now: number, days = 14) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const firstDay = start.getTime() - (days - 1) * 24 * HOUR;
  const out = Array.from({ length: days }, () => 0);
  for (const set of sets) {
    const i = Math.floor((set.at - firstDay) / (24 * HOUR));
    if (i >= 0 && i < days) out[i] += role(set.exerciseId, m);
  }
  return out;
}

/** What happened to muscle `m`: one row per exercise per session, newest first. */
export function muscleHistory(sessions: Session[], m: MuscleId, limit = 8) {
  const rows: { sessionId: string; sessionName: string; at: string; exerciseId: string; sets: number; topKg: number; reps: number; role: "primary" | "secondary" }[] = [];
  const finished = sessions.filter((s) => s.finishedAt).sort((a, b) => Date.parse(b.finishedAt!) - Date.parse(a.finishedAt!));
  for (const s of finished) {
    for (const e of s.exercises) {
      const r = role(e.exerciseId, m);
      const done = e.sets.filter((x) => x.done);
      if (!r || !done.length) continue;
      rows.push({
        sessionId: s.id,
        sessionName: s.name,
        at: s.finishedAt!,
        exerciseId: e.exerciseId,
        sets: done.length,
        topKg: Math.max(...done.map((x) => x.weightKg)),
        reps: Math.round(done.reduce((sum, x) => sum + x.reps, 0) / done.length),
        role: r === 1 ? "primary" : "secondary",
      });
      if (rows.length >= limit) return rows;
    }
  }
  return rows;
}
