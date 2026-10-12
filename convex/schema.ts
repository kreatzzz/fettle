// The app is local-first. Convex keeps one backup document per device (no accounts),
// plus a tiny log used to rate-limit the AI coach.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  userData: defineTable({
    deviceId: v.string(),
    data: v.any(), // the app's AppData snapshot (src/store/app-store.ts)
    updatedAt: v.number(),
  }).index("by_device", ["deviceId"]),

  coachCalls: defineTable({
    deviceId: v.string(),
  }).index("by_device", ["deviceId"]),
});
