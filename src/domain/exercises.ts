import type { EquipmentId } from "./equipment";
import type { MuscleId } from "./muscles";

export type MovementPattern = "squat" | "hinge" | "push" | "pull" | "core" | "isolation" | "lunge";

export type Exercise = {
  id: string;
  name: string;
  pattern: MovementPattern;
  primary: MuscleId[]; // 1.0 per set
  secondary: MuscleId[]; // 0.5 per set
  equipment: EquipmentId[]; // ALL required; [] is bodyweight
  cue: string;
};

const ex = (
  id: string,
  name: string,
  pattern: MovementPattern,
  primary: MuscleId[],
  secondary: MuscleId[],
  equipment: EquipmentId[],
  cue: string,
): Exercise => ({ id, name, pattern, primary, secondary, equipment, cue });

export const EXERCISES: Exercise[] = [
  // Squat
  ex("back-squat", "Back squat", "squat", ["quads", "glutes"], ["adductors", "lower-back"], ["barbell", "plates", "rack"], "Brace, sit between your hips."),
  ex("goblet-squat", "Goblet squat", "squat", ["quads", "glutes"], ["adductors", "abs"], ["dumbbells"], "Elbows inside knees, chest tall."),
  ex("leg-press", "Leg press", "squat", ["quads", "glutes"], ["adductors"], ["leg-press"], "Lower until hips start to tuck."),
  ex("air-squat", "Bodyweight squat", "squat", ["quads", "glutes"], ["adductors"], [], "Slow down, pause at the bottom."),
  ex("smith-squat", "Smith machine squat", "squat", ["quads", "glutes"], ["adductors"], ["smith-machine"], "Feet slightly forward of the bar."),
  ex("leg-extension", "Leg extension", "isolation", ["quads"], [], ["leg-extension"], "Squeeze at the top for a beat."),
  // Lunge
  ex("split-squat", "Bulgarian split squat", "lunge", ["quads", "glutes"], ["adductors"], ["dumbbells", "bench"], "Most weight on the front foot."),
  ex("walking-lunge", "Walking lunge", "lunge", ["quads", "glutes"], ["hamstrings", "adductors"], [], "Long stride, knee kisses the floor."),
  ex("db-lunge", "Dumbbell reverse lunge", "lunge", ["quads", "glutes"], ["hamstrings"], ["dumbbells"], "Step back, drive through the front heel."),
  // Hinge
  ex("deadlift", "Deadlift", "hinge", ["hamstrings", "glutes", "lower-back"], ["traps", "forearms", "upper-back"], ["barbell", "plates"], "Push the floor away, bar close."),
  ex("rdl", "Romanian deadlift", "hinge", ["hamstrings", "glutes"], ["lower-back", "forearms"], ["barbell", "plates"], "Hips back until hamstrings stretch."),
  ex("db-rdl", "Dumbbell RDL", "hinge", ["hamstrings", "glutes"], ["lower-back"], ["dumbbells"], "Soft knees, weights slide down thighs."),
  ex("hip-thrust", "Hip thrust", "hinge", ["glutes"], ["hamstrings"], ["barbell", "plates", "bench"], "Chin tucked, ribs down at lockout."),
  ex("glute-bridge", "Glute bridge", "hinge", ["glutes"], ["hamstrings"], [], "Drive through heels, squeeze 1s."),
  ex("kb-swing", "Kettlebell swing", "hinge", ["glutes", "hamstrings"], ["lower-back", "shoulders"], ["kettlebell"], "Snap the hips, arms just guide."),
  ex("leg-curl", "Leg curl", "isolation", ["hamstrings"], ["calves"], ["leg-curl"], "Control the way back up."),
  ex("back-extension", "Back extension", "hinge", ["lower-back"], ["glutes", "hamstrings"], [], "Lift slowly, no swinging."),
  // Push
  ex("bench-press", "Bench press", "push", ["chest"], ["triceps", "shoulders"], ["barbell", "plates", "bench", "rack"], "Shoulder blades pinned, feet planted."),
  ex("db-bench", "Dumbbell bench press", "push", ["chest"], ["triceps", "shoulders"], ["dumbbells", "bench"], "Lower to mid-chest, elbows ~45°."),
  ex("incline-db-press", "Incline dumbbell press", "push", ["chest", "shoulders"], ["triceps"], ["dumbbells", "bench"], "Bench at 30°, press up and in."),
  ex("push-up", "Push-up", "push", ["chest"], ["triceps", "shoulders", "abs"], [], "Body in one line, chest to fist height."),
  ex("dips", "Dips", "push", ["chest", "triceps"], ["shoulders"], ["dip-station"], "Slight lean forward, shoulders down."),
  ex("cable-fly", "Cable fly", "isolation", ["chest"], ["shoulders"], ["cable"], "Hug a big tree, soft elbows."),
  ex("ohp", "Overhead press", "push", ["shoulders"], ["triceps", "traps"], ["barbell", "plates"], "Squeeze glutes, head through at the top."),
  ex("db-shoulder-press", "Dumbbell shoulder press", "push", ["shoulders"], ["triceps"], ["dumbbells"], "Press up, not forward."),
  ex("pike-push-up", "Pike push-up", "push", ["shoulders"], ["triceps", "chest"], [], "Hips high, head travels forward."),
  ex("lateral-raise", "Lateral raise", "isolation", ["shoulders"], ["traps"], ["dumbbells"], "Lead with elbows, stop at shoulder height."),
  ex("band-lateral-raise", "Band lateral raise", "isolation", ["shoulders"], [], ["bands"], "Slow on the way down."),
  ex("triceps-pushdown", "Triceps pushdown", "isolation", ["triceps"], [], ["cable"], "Elbows pinned to your sides."),
  ex("skull-crusher", "Dumbbell skull crusher", "isolation", ["triceps"], [], ["dumbbells", "bench"], "Elbows point at the ceiling."),
  ex("bench-dip", "Bench dip", "isolation", ["triceps"], ["chest", "shoulders"], ["bench"], "Shoulders away from ears."),
  // Pull
  ex("pull-up", "Pull-up", "pull", ["upper-back"], ["biceps", "forearms"], ["pull-up-bar"], "Chest to the bar, full hang at the bottom."),
  ex("lat-pulldown", "Lat pulldown", "pull", ["upper-back"], ["biceps"], ["lat-pulldown"], "Pull elbows to back pockets."),
  ex("barbell-row", "Barbell row", "pull", ["upper-back"], ["biceps", "lower-back", "traps"], ["barbell", "plates"], "Torso ~45°, bar to belly button."),
  ex("db-row", "One-arm dumbbell row", "pull", ["upper-back"], ["biceps", "traps"], ["dumbbells", "bench"], "Row toward the hip, not the chest."),
  ex("cable-row", "Seated cable row", "pull", ["upper-back"], ["biceps", "traps"], ["cable"], "Sit tall, squeeze shoulder blades."),
  ex("band-row", "Band row", "pull", ["upper-back"], ["biceps"], ["bands"], "Pause with hands at your ribs."),
  ex("inverted-row", "Inverted row", "pull", ["upper-back"], ["biceps", "abs"], ["smith-machine"], "Body straight, chest to bar."),
  ex("face-pull", "Face pull", "isolation", ["shoulders", "traps"], ["upper-back"], ["cable"], "Pull to eyes, thumbs back."),
  ex("band-pull-apart", "Band pull-apart", "isolation", ["shoulders", "traps"], ["upper-back"], ["bands"], "Arms straight, squeeze between shoulders."),
  ex("shrug", "Dumbbell shrug", "isolation", ["traps"], ["neck", "forearms"], ["dumbbells"], "Straight up, hold 1s."),
  ex("db-curl", "Dumbbell curl", "isolation", ["biceps"], ["forearms"], ["dumbbells"], "No swinging, full stretch."),
  ex("hammer-curl", "Hammer curl", "isolation", ["biceps", "forearms"], [], ["dumbbells"], "Thumbs up the whole way."),
  ex("ez-curl", "EZ-bar curl", "isolation", ["biceps"], ["forearms"], ["ez-bar"], "Elbows stay by your sides."),
  ex("band-curl", "Band curl", "isolation", ["biceps"], ["forearms"], ["bands"], "Squeeze at the top."),
  // Calves, shins
  ex("calf-raise", "Standing calf raise", "isolation", ["calves"], [], [], "Full stretch, pause at the top."),
  ex("db-calf-raise", "Dumbbell calf raise", "isolation", ["calves"], ["tibialis"], ["dumbbells"], "One leg at a time on a step."),
  ex("tib-raise", "Tibialis raise", "isolation", ["tibialis"], [], [], "Back on a wall, toes up."),
  // Core
  ex("plank", "Plank", "core", ["abs"], ["obliques", "shoulders"], [], "Squeeze glutes, ribs down."),
  ex("hanging-leg-raise", "Hanging leg raise", "core", ["abs"], ["obliques", "forearms"], ["pull-up-bar"], "Curl the pelvis up, no swing."),
  ex("ab-wheel", "Ab wheel rollout", "core", ["abs"], ["obliques", "upper-back"], ["ab-wheel"], "Hips follow, never sag."),
  ex("side-plank", "Side plank", "core", ["obliques"], ["abs", "shoulders"], [], "Stack the hips, push the floor away."),
  ex("cable-woodchop", "Cable woodchop", "core", ["obliques"], ["abs", "shoulders"], ["cable"], "Rotate through the torso, arms long."),
  ex("dead-bug", "Dead bug", "core", ["abs"], ["obliques"], [], "Lower back stays glued down."),
];

export const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function exerciseName(id: string) {
  return EXERCISE_BY_ID.get(id)?.name ?? "Unknown exercise";
}

export function isAvailable(e: Exercise, equipment: readonly string[]) {
  return e.equipment.every((item) => equipment.includes(item));
}
