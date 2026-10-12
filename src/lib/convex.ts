/** Convex client. Null when EXPO_PUBLIC_CONVEX_URL isn't set, so the app still runs fully offline. */
import { ConvexReactClient } from "convex/react";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
export const convex = url ? new ConvexReactClient(url, { unsavedChangesWarning: false }) : null;
