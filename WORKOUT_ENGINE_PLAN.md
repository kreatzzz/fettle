# Fettle workout engine — technical plan

Scope: the muscle figure, the fatigue model behind it, equipment inventory per location, and the workout generator with exercise swaps. This plan stands alone and assumes a fresh React Native codebase.

## As built (Oct 2026)

Where the first version differs from the plan below:

- **Muscle ids** match the artwork regions: chest, shoulders, biceps, triceps, forearms, abs, obliques, neck, traps, upper-back (lats and upper back), lower-back, glutes, quads, hamstrings, adductors, calves and tibialis. The front, side and rear delts are one "shoulders" region because the artwork draws them as one shape. See `src/domain/muscles.ts`.
- **Artwork** is in `src/features/body/art.ts`. The paths come from react-native-body-highlighter (MIT, credited in the file). `MuscleMap.tsx` draws it on a night stage, and the gaps between muscles act as separation lines. Tapping a muscle opens `/muscle/[id]`, which shows its level, when it'll be fresh again, sets in the last 7 days, a 14-day chart, the sets that hit it, and exercises available at your place.
- **Levels** are four rather than three: Fresh below 0.15, Light below 0.4, Worked below 0.75, then Heavy. The detail page also shows "Fresh again in ~X", from `recoveredInHours`.
- **Persistence** uses zustand with AsyncStorage (`src/store/app-store.ts`, key `fettle-v1`, version 1) instead of SQLite. Data volumes are small for now. Switch to SQLite once history needs date queries.
- **Generator:** the readiness cut-off is 0.3. Loaded variants get +1.5 when the gear exists (bands +0.5), so a gym session doesn't fill up with bodyweight moves. A primary muscle that's already in the draft gets −4 so the work spreads out. Swaps are stored as per-slot overrides on the plan. "Don't suggest again" writes `blocked`.
- **Coach:** typed phrases map to plan changes (focus, length, shuffle) in `src/app/(tabs)/coach.tsx`. Voice and the `PlanEdit`/`applyEdits` hook are still to come.
- **Sample data:** Profile has a "Load sample week" button that replaces your meals and workouts with a demo. It's never mixed into real history.

## Decisions

1. **Stack:** Expo (managed, TypeScript) with Expo Router. Fatigue, generation and swaps are pure TypeScript in a `domain/` folder with no React imports, so the screens, the AI coach and voice all call the same functions and it is easy to unit test.
2. **No invented scores.** The app never shows a recovery score, readiness percentage or health score it can't trace to logged data. The figure shows three plain levels derived from logged sets and is labeled "Estimated from your logged sets". Missing data stays missing; no sample data is mixed into real history.
3. **Preview, never silent.** A generated workout and every swap is a draft the user reviews and applies. Changing location or swapping never rewrites a completed workout.
4. **Equipment is an inventory, not a gym/home label.** Each exercise declares every item it needs, and a place has an explicit list. An unavailable exercise says what is missing.
5. **Derive, don't store, fatigue.** Muscle load is computed from logged sets on demand, so it can never disagree with history after an edit or delete.
6. **Local-first.** Data lives in on-device storage with a versioned schema. If a stored schema can't be read, keep the old record and surface the error instead of overwriting it.

## Libraries

| Need | Choice | Why |
| --- | --- | --- |
| Muscle figure | `react-native-svg` | One path per muscle, tappable, themeable, no extra native module beyond what Expo ships. |
| Figure artwork | Own `muscle-paths.ts`, path data adapted from `react-native-body-highlighter` (MIT, credit in file header) | Avoids drawing ~35 paths from scratch while we keep control of colors, hit areas and accessibility. Not taken as a dependency because its press and color API doesn't fit a design system. |
| Persistence | `expo-sqlite` (or MMKV for small settings) | Sets are queried by date and exercise; SQLite handles history growth better than one JSON blob. |
| Charts | `react-native-svg` bars and lines, hand-built | Per-muscle weekly bars and trend lines are simple; no charting dependency. |
| Fill animation | `react-native-reanimated`, optional | Only if a cross-fade on fill change is wanted. v1 can change fills instantly. |
| Seeded shuffle | 10-line `mulberry32` in `domain/random.ts` | Reproducible "regenerate" without a dependency. |
| Tests | `jest` + `jest-expo` | Domain functions are pure, so tests are fast. |

## Data model

### Muscles (`domain/muscles.ts`)

A fixed id set that maps 1:1 to figure regions.

```ts
export type MuscleId =
  | "chest" | "front-delts" | "side-delts" | "rear-delts"
  | "biceps" | "triceps" | "forearms"
  | "abs" | "obliques"
  | "traps" | "lats" | "upper-back" | "lower-back"
  | "glutes" | "quads" | "hamstrings" | "adductors" | "calves";

export const MUSCLES: Record<MuscleId, {
  label: string;
  views: ("front" | "back")[];
  halfLifeHours: number;   // recovery decay speed
  weeklySetsHigh: number;  // weekly load that reads as "heavily worked"
}>;
```

### Equipment catalog (`domain/equipment.ts`)

Starting catalog; ids are stable strings so exercises and places reference them.

```
Free weights:   dumbbells, barbell, plates, ez-bar, kettlebell, trap-bar
Stations:       rack, adjustable-bench, flat-bench, smith-machine, dip-station, pull-up-bar
Machines:       cable, lat-pulldown, leg-press, leg-curl, leg-extension
Light/other:    resistance-bands, suspension-trainer, ab-wheel
Cardio:         treadmill, bike, rower
```

```ts
export type EquipmentId = string; // from the catalog above
export type Place = {
  id: string;
  name: string;                  // "Home", "Anytime Fitness"
  kind: "home" | "gym";
  equipment: EquipmentId[];
  limits?: { dumbbellMaxKg?: number; kettlebellKg?: number[] };
};
```

`limits` stops the generator prescribing a weight the user can't load at home. It is edited from the place screen, not asked during onboarding. Users can have several places and switch before a session. Place presets (e.g. "Commercial gym", "Dumbbells only") pre-fill the list but remain editable.

### Exercises (`domain/exercises.ts`, bundled seed data)

```ts
export type MovementPattern =
  "squat" | "hinge" | "push" | "pull" | "core" | "carry" | "isolation" | "cardio";

export type Exercise = {
  id: string;
  name: string;
  pattern: MovementPattern;
  primary: MuscleId[];       // counts 1.0 per set
  secondary: MuscleId[];     // counts 0.5 per set
  equipment: EquipmentId[];  // ALL required; [] means bodyweight
  unilateral?: boolean;
  cue: string;               // one line
};
```

Variants are separate exercises (dumbbell bench vs floor press vs barbell bench), so `equipment` stays a simple all-of list. A barbell bench press requires `barbell`, `plates`, `rack` and `adjustable-bench`. Seed ~60 exercises to cover every pattern at three equipment tiers: bodyweight, dumbbell/band home, and full gym. Equipment lists describe the specific variation, not every possible adaptation.

### Logged data

```ts
export type SetLog = {
  id: string;
  sessionId: string;
  exerciseId: string;
  completedAt: string;       // ISO time
  reps: number;
  weightKg: number;          // external load; 0 for bodyweight
  restSeconds?: number;
  rir?: number;              // reps in reserve 0–4, optional
};
export type Session = {
  id: string; placeId: string; routineName: string;
  startedAt: string; finishedAt?: string; note: string;
};
```

Starting a session copies its routine into a session record, so editing the routine later doesn't alter history. Interrupted sessions can resume. Finishing an empty session does not count as a workout. Bodyweight sets count as completed work and are never given an invented external volume.

### Exercise preferences

```ts
export type ExercisePreference = {
  status: "favorite" | "disliked" | "blocked"; // blocked = pain or can't do; never generated
  reason?: "pain" | "equipment-busy" | "boring" | "too-hard" | "other";
  updatedAt: string;
};
// stored per exerciseId
```

## Fatigue model (`domain/fatigue.ts`)

For each muscle `m` at time `t`, over every completed set in the last 7 days:

```
stimulus(set, m) = role(m) × effort(set)
  role:   1.0 primary, 0.5 secondary, 0 otherwise
  effort: rir 0–1 → 1.2,  rir 2–3 → 1.0,  rir 4+ → 0.7,  unknown → 1.0

load(m, t) = Σ stimulus × 0.5 ^ ((t − set.completedAt) / halfLifeHours(m))
ratio(m)   = load(m, t) / weeklySetsHigh(m)
```

Starting constants (all in one table, tunable): large muscles (quads, glutes, hamstrings, lats, chest, lower-back) half-life 36h, `weeklySetsHigh` 6; small muscles (delts, arms, calves, abs) half-life 24h, `weeklySetsHigh` 5. These are heuristics, not physiology, and the UI wording says "estimated".

Levels shown: `ratio < 0.25` **Fresh**, `0.25–0.6` **Worked**, `> 0.6` **Heavily worked**. Generator readiness is `clamp(1 − ratio, 0, 1)`. A user-reported "sore" tag from exercise feedback lifts a muscle to Worked for 48h and is labeled "you reported" so it is distinguishable from computed load.

```ts
export function muscleLoad(sets: SetLog[], now: Date): Record<MuscleId, {
  ratio: number; level: "fresh" | "worked" | "heavy";
  lastTrainedAt?: string; setsLast7d: number;
}>;
```

## Muscle figure (`components/MuscleMap.tsx`)

- Front and back figures side by side on wide screens; a two-segment toggle on phones.
- Neutral silhouette, muscles filled by level: gray (Fresh), accent at 45% opacity (Worked), full accent (Heavily worked). One accent color; no red/green coding. Colors come from the design-system tokens, so dark and light modes both work.
- Each region is a pressable group with an enlarged invisible hit path so small muscles meet a 48px touch target, and an accessibility label such as "Quads, heavily worked, last trained yesterday". Never rely on color alone.
- Tapping opens a sheet: level, last trained, sets in the last 7 days, and exercises that hit it. No paragraphs.
- One legend row. Used on Today (compact, read-only), in Workouts (full, tappable), and in the generator preview, where the targeted muscles are outlined rather than filled so it doesn't read as fatigue.

## Generator (`domain/generator.ts`)

```ts
export function generateWorkout(input: {
  place: Place;
  goal: "strength" | "muscle" | "general";
  experience: "new" | "regular";
  sets: SetLog[];
  prefs: Record<string, ExercisePreference>;
  now: Date;
  durationMin?: number;   // default 45
  focus?: "auto" | "upper" | "lower" | "full" | MuscleId[];
  seed?: number;
}): {
  exercises: { exerciseId: string; sets: number; reps: number; restSeconds: number; suggestedKg?: number }[];
  reasons: Record<string, string>;
  skipped: { muscle: MuscleId; why: string }[];
};
```

1. **Readiness.** Compute `muscleLoad`. With `focus: "auto"`, choose upper, lower or full body by whichever group has the highest average readiness.
2. **Slots.** Template by focus and duration: full body at 45 min is squat-or-hinge, push, pull, second lower, accessory, core, at about 8 minutes per slot including rest; fewer slots for shorter sessions.
3. **Candidates per slot.** Exercise matches the slot's pattern, every required item is in the place's equipment, not `blocked`, and its primary muscles have readiness ≥ 0.4.
4. **Score.** `avg readiness of primary muscles × 10 + favorite 3 − disliked 6 − used in the last session 2 + seeded jitter 0–1`. Take the top. Disliked exercises remain possible when nothing else fits, which matters for small home inventories.
5. **Dose.** Strength 4×5 with 150s rest, muscle 3×8–12 with 90s, general 2–3×10 with 60s; `new` experience gets one fewer set. Suggested weight is the last logged weight for that exercise only; otherwise blank. Never estimate from body weight, age or sex.
6. **Explain.** One short reason per pick ("Chest is fresh, uses your dumbbells") and a `skipped` list ("Hamstrings: no hinge possible with this equipment").

A first-ever workout uses the same function with an empty history, so there is a single code path. The result is an editable draft: users can add, remove and change exercises, sets, reps and rest.

### Swaps

```ts
export function getAlternatives(exerciseId, place, prefs, load): Exercise[];
```

- Same movement pattern, shares the original's first primary muscle, every required item is available at the place, and not `blocked`. Matching a pattern is not a promise of identical difficulty or suitability for an injury.
- Rank by shared primary muscles, then readiness, then favorites; disliked last.
- The swap sheet shows three options with the equipment each uses, plus "Don't suggest this again", which writes `disliked` or `blocked` with an optional reason chip. One tap, no form.
- Unavailable exercises explain what is missing ("Needs: rack, barbell").
- Swapping inside an active session changes only remaining sets; completed sets keep their original exercise.

### Hooks for the AI coach and voice

The coach and voice assistant propose edits in a fixed shape; the app validates and previews them, and the user taps Apply. They never mutate history directly.

```ts
type PlanEdit =
  | { op: "swap"; exerciseId: string; withId: string }
  | { op: "set-dose"; exerciseId: string; sets?: number; reps?: number; restSeconds?: number }
  | { op: "set-pref"; exerciseId: string; status: ExercisePreference["status"]; reason?: string }
  | { op: "regenerate"; focus?: string; durationMin?: number };

export function applyEdits(draft, edits, ctx): { draft; rejected: { edit: PlanEdit; why: string }[] };
```

`applyEdits` rejects anything unavailable at the place or blocked. Only the relevant context is sent to the coach (selected place and equipment, current draft, recent sets, the user's feedback), and the UI shows what is shared.

## Where it lives in the app

Tabs are Today, Meals, Workouts, Equipment, Coach (Expo Router).

| Tab | Engine surface |
| --- | --- |
| Today | Compact read-only muscle map, next suggested workout, Start button |
| Workouts | Generated draft with reasons, swap sheet, session logging, full tappable muscle map and per-muscle weekly bars |
| Equipment | Places, per-place inventory, optional limits, "what's missing" for unavailable exercises |
| Coach | Voice and chat produce `PlanEdit` proposals; Apply goes through `applyEdits` |
| Meals | Not part of this engine |

```
src/domain/    muscles.ts  equipment.ts  exercises.ts  fatigue.ts  generator.ts  random.ts
src/components/MuscleMap.tsx  muscle-paths.ts
src/app/(tabs)/   today  meals  workouts  equipment  coach
```

## Build order

1. Muscle ids, equipment catalog and the seeded exercise list, with a test that every exercise references valid muscles and equipment.
2. `muscleLoad` with tests: decay at 0h, one half-life and 7 days; secondary weighting; rir; empty and edited history.
3. Muscle figure with the detail sheet in Workouts, then the compact Today version.
4. Equipment tab: places, inventory, availability explanations.
5. Exercise preferences and the swap sheet.
6. `generateWorkout`. Tests: deterministic with a seed; never returns unavailable or blocked exercises; respects duration; an empty home inventory still yields a bodyweight session.
7. `PlanEdit` and `applyEdits`, wired to the coach once the voice transport is decided.

Each step passes lint, typecheck and the domain tests before the next.

## Defaults I picked (change any)

- **Levels, not percentages** on the figure, to honor decision 2.
- **Path artwork adapted** from an MIT body map rather than drawn new.
- **Effort logging optional.** `rir` is hidden behind a long-press on the set row so logging stays one tap.
- **SQLite** over a single JSON blob for history.
