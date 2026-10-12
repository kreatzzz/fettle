import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { deviceId: v.string() },
  handler: (ctx, { deviceId }) =>
    ctx.db
      .query("userData")
      .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
      .unique(),
});

export const save = mutation({
  args: { deviceId: v.string(), data: v.any(), updatedAt: v.number() },
  handler: async (ctx, { deviceId, data, updatedAt }) => {
    const row = await ctx.db
      .query("userData")
      .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
      .unique();
    if (row) await ctx.db.patch(row._id, { data, updatedAt });
    else await ctx.db.insert("userData", { deviceId, data, updatedAt });
  },
});
