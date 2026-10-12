/**
 * Backs the store up to Convex. Local state stays the source of truth: changes are
 * pushed (debounced), and on launch a newer remote copy replaces the local one.
 * Everything fails quietly, so the app works offline.
 */
import { api } from "../../convex/_generated/api";
import { convex } from "@/lib/convex";
import { pickData, useApp, type AppData } from "@/store/app-store";

const KEYS: (keyof AppData)[] = ["onboarded", "profile", "places", "activePlaceId", "meals", "sessions", "prefs", "plan"];

let started = false;
let applying = false;

export async function startSync() {
  if (!convex || started) return;
  started = true;
  const client = convex;
  const deviceId = useApp.getState().deviceId;

  try {
    const remote = await client.query(api.userData.get, { deviceId });
    if (remote && remote.updatedAt > useApp.getState().savedAt) {
      applying = true;
      useApp.setState({ ...remote.data, savedAt: remote.updatedAt });
      applying = false;
    }
  } catch {}

  let timer: ReturnType<typeof setTimeout> | undefined;
  useApp.subscribe((state, prev) => {
    if (applying || KEYS.every((k) => state[k] === prev[k])) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const updatedAt = Date.now();
      try {
        await client.mutation(api.userData.save, { deviceId, data: pickData(useApp.getState()), updatedAt });
        applying = true;
        useApp.setState({ savedAt: updatedAt });
        applying = false;
      } catch {}
    }, 1500);
  });
}
