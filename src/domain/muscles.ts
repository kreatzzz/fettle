/** Muscle ids map 1:1 to tappable regions of the body figure (features/body). */
export type MuscleId =
  | "chest" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "abs" | "obliques" | "neck" | "traps" | "upper-back" | "lower-back"
  | "glutes" | "quads" | "hamstrings" | "adductors" | "calves" | "tibialis";

export type MuscleInfo = {
  label: string;
  group: "upper" | "core" | "lower";
  views: ("front" | "back")[];
  halfLifeHours: number; // recovery decay speed
  weeklySetsHigh: number; // decayed load that reads as "heavy"
};

const big = { halfLifeHours: 36, weeklySetsHigh: 6 };
const small = { halfLifeHours: 24, weeklySetsHigh: 5 };

export const MUSCLES: Record<MuscleId, MuscleInfo> = {
  chest: { label: "Chest", group: "upper", views: ["front"], ...big },
  shoulders: { label: "Shoulders", group: "upper", views: ["front", "back"], ...small },
  biceps: { label: "Biceps", group: "upper", views: ["front"], ...small },
  triceps: { label: "Triceps", group: "upper", views: ["front", "back"], ...small },
  forearms: { label: "Forearms", group: "upper", views: ["front", "back"], ...small },
  neck: { label: "Neck", group: "upper", views: ["front", "back"], ...small },
  traps: { label: "Traps", group: "upper", views: ["front", "back"], ...small },
  "upper-back": { label: "Lats & upper back", group: "upper", views: ["back"], ...big },
  abs: { label: "Abs", group: "core", views: ["front"], ...small },
  obliques: { label: "Obliques", group: "core", views: ["front"], ...small },
  "lower-back": { label: "Lower back", group: "core", views: ["back"], ...big },
  glutes: { label: "Glutes", group: "lower", views: ["back"], ...big },
  quads: { label: "Quads", group: "lower", views: ["front"], ...big },
  hamstrings: { label: "Hamstrings", group: "lower", views: ["back"], ...big },
  adductors: { label: "Adductors", group: "lower", views: ["front", "back"], ...small },
  calves: { label: "Calves", group: "lower", views: ["front", "back"], ...small },
  tibialis: { label: "Shins", group: "lower", views: ["front"], ...small },
};

export const MUSCLE_IDS = Object.keys(MUSCLES) as MuscleId[];

export function isMuscleId(v: string): v is MuscleId {
  return v in MUSCLES;
}
