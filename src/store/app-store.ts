/**
 * App state, persisted on-device (AsyncStorage) with a versioned schema.
 * Derived values (fatigue, today's totals, the workout draft) are computed from
 * this state in selectors and screens, never stored.
 *
 * There is no sign-in: the app runs as one dummy user (Sam), seeded with two
 * weeks of sample data on first launch. "Erase my data" sends it back to onboarding.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoAccount } from "@/domain/demo";
import { presetEquipment, type EquipmentId, type Place } from "@/domain/equipment";
import type { DraftItem, Focus } from "@/domain/generator";
import { uid } from "@/domain/random";
import { tick } from "@/lib/clock";
import type { Meal, PrefStatus, Profile, Session, SetEntry } from "@/domain/types";

export type PlanOptions = { focus: Focus; durationMin: number; seed: number; swaps: Record<number, string> };

export type AppData = {
  onboarded: boolean;
  profile: Profile | null;
  places: Place[];
  activePlaceId: string | null;
  meals: Meal[];
  sessions: Session[];
  prefs: Record<string, PrefStatus>;
  plan: PlanOptions;
};

/** Backup bookkeeping (see src/lib/sync.ts). `deviceId` is the anonymous id the backup is stored under. */
type Device = { deviceId: string; savedAt: number };

type Actions = {
  completeOnboarding: (profile: Profile, place: Omit<Place, "id">) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  addMeal: (meal: Omit<Meal, "id" | "at"> & { at?: string }) => void;
  deleteMeal: (id: string) => void;
  setActivePlace: (id: string) => void;
  addPlace: (name: string, kind: Place["kind"]) => void;
  deletePlace: (id: string) => void;
  toggleEquipment: (placeId: string, item: EquipmentId) => void;
  setPlan: (patch: Partial<Omit<PlanOptions, "swaps">>) => void;
  regenerate: () => void;
  swapPlanItem: (index: number, exerciseId: string) => void;
  startSession: (name: string, items: DraftItem[]) => string;
  updateSet: (sessionId: string, exIndex: number, setIndex: number, patch: Partial<SetEntry>) => void;
  addSet: (sessionId: string, exIndex: number) => void;
  finishSession: (sessionId: string) => void;
  discardSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  setPref: (exerciseId: string, status: PrefStatus | null) => void;
  reset: () => void;
};

const initial: AppData = {
  onboarded: false,
  profile: null,
  places: [],
  activePlaceId: null,
  meals: [],
  sessions: [],
  prefs: {},
  plan: { focus: "auto", durationMin: 45, seed: 1, swaps: {} },
};

const mapSession = (sessions: Session[], id: string, fn: (s: Session) => Session) => sessions.map((s) => (s.id === id ? fn(s) : s));

export const useApp = create<AppData & Device & Actions>()(
  persist(
    (set, get) => ({
      ...demoAccount(),
      deviceId: uid(),
      savedAt: 0,

      completeOnboarding: (profile, place) => {
        const id = uid();
        set({ onboarded: true, profile, places: [{ ...place, id }], activePlaceId: id });
      },
      updateProfile: (patch) => set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : {})),

      addMeal: (meal) => {
        tick();
        set((s) => ({ meals: [...s.meals, { ...meal, id: uid(), at: meal.at ?? new Date().toISOString() }] }));
      },
      deleteMeal: (id) => set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),

      setActivePlace: (id) => set((s) => ({ activePlaceId: id, plan: { ...s.plan, swaps: {} } })),
      addPlace: (name, kind) => {
        const id = uid();
        // A new gym starts with the full-gym preset; a home starts empty.
        const equipment = kind === "gym" ? presetEquipment("gym") : [];
        set((s) => ({ places: [...s.places, { id, name, kind, equipment }], activePlaceId: id }));
      },
      deletePlace: (id) =>
        set((s) => {
          const places = s.places.filter((p) => p.id !== id);
          return { places, activePlaceId: s.activePlaceId === id ? (places[0]?.id ?? null) : s.activePlaceId };
        }),
      toggleEquipment: (placeId, item) =>
        set((s) => ({
          places: s.places.map((p) =>
            p.id !== placeId
              ? p
              : { ...p, equipment: p.equipment.includes(item) ? p.equipment.filter((e) => e !== item) : [...p.equipment, item] },
          ),
          plan: { ...s.plan, swaps: {} },
        })),

      setPlan: (patch) => set((s) => ({ plan: { ...s.plan, ...patch, swaps: {} } })),
      regenerate: () => set((s) => ({ plan: { ...s.plan, seed: s.plan.seed + 1, swaps: {} } })),
      swapPlanItem: (index, exerciseId) => set((s) => ({ plan: { ...s.plan, swaps: { ...s.plan.swaps, [index]: exerciseId } } })),

      startSession: (name, items) => {
        const id = uid();
        const session: Session = {
          id,
          name,
          placeId: get().activePlaceId ?? "",
          startedAt: new Date().toISOString(),
          exercises: items.map((it) => ({
            exerciseId: it.exerciseId,
            reason: it.reason,
            sets: Array.from({ length: it.sets }, () => ({ reps: it.reps, weightKg: it.weightKg, done: false })),
          })),
        };
        // Only one session can be in progress; an abandoned one is dropped.
        set((s) => ({ sessions: [...s.sessions.filter((x) => x.finishedAt), session] }));
        return id;
      },
      updateSet: (sessionId, exIndex, setIndex, patch) =>
        set((s) => ({
          sessions: mapSession(s.sessions, sessionId, (session) => ({
            ...session,
            exercises: session.exercises.map((e, i) =>
              i !== exIndex ? e : { ...e, sets: e.sets.map((x, j) => (j === setIndex ? { ...x, ...patch } : x)) },
            ),
          })),
        })),
      addSet: (sessionId, exIndex) =>
        set((s) => ({
          sessions: mapSession(s.sessions, sessionId, (session) => ({
            ...session,
            exercises: session.exercises.map((e, i) => {
              if (i !== exIndex) return e;
              const last = e.sets[e.sets.length - 1] ?? { reps: 10, weightKg: 0, done: false };
              return { ...e, sets: [...e.sets, { ...last, done: false }] };
            }),
          })),
        })),
      finishSession: (sessionId) =>
        set((s) => {
          const session = s.sessions.find((x) => x.id === sessionId);
          // An empty session doesn't count as a workout.
          if (!session?.exercises.some((e) => e.sets.some((x) => x.done))) {
            return { sessions: s.sessions.filter((x) => x.id !== sessionId) };
          }
          tick();
          return {
            sessions: mapSession(s.sessions, sessionId, (x) => ({ ...x, finishedAt: new Date().toISOString() })),
            plan: { ...s.plan, seed: s.plan.seed + 1, swaps: {} },
          };
        }),
      discardSession: (sessionId) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== sessionId || x.finishedAt) })),
      deleteSession: (sessionId) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== sessionId) })),

      setPref: (exerciseId, status) =>
        set((s) => {
          const prefs = { ...s.prefs };
          if (status) prefs[exerciseId] = status;
          else delete prefs[exerciseId];
          return { prefs };
        }),

      // Erases all data and goes back to onboarding.
      reset: () => set({ ...initial }),
    }),
    {
      name: "fettle-v1",
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): AppData & Device => ({ ...pickData(s), deviceId: s.deviceId, savedAt: s.savedAt }),
      // v1/v2 had local accounts: keep the data of the signed-in one, drop accounts and the vault.
      migrate: (persisted) => {
        const { account: _account, vault: _vault, ...data } = persisted as AppData & { account?: unknown; vault?: unknown };
        return data.onboarded ? data : { ...data, ...demoAccount() };
      },
    },
  ),
);

export function pickData(s: AppData): AppData {
  const { onboarded, profile, places, activePlaceId, meals, sessions, prefs, plan } = s;
  return { onboarded, profile, places, activePlaceId, meals, sessions, prefs, plan };
}

const subscribeHydration = (cb: () => void) => useApp.persist.onFinishHydration(cb);
const hasHydrated = () => useApp.persist.hasHydrated();

/** True once persisted state has loaded from disk. */
export function useHydrated() {
  return useSyncExternalStore(subscribeHydration, hasHydrated, hasHydrated);
}

export function useActivePlace() {
  const places = useApp((s) => s.places);
  const activeId = useApp((s) => s.activePlaceId);
  return places.find((p) => p.id === activeId) ?? places[0] ?? null;
}

export function useActiveSession() {
  const sessions = useApp((s) => s.sessions);
  return sessions.find((x) => !x.finishedAt) ?? null;
}
