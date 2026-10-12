/**
 * Speech-to-text for the voice coach. The app records a short clip and sends the
 * bytes here; this action forwards them to Groq's OpenAI-compatible Whisper endpoint.
 *
 * This endpoint is public (no accounts), so it assumes hostile callers:
 *  - every argument is validated and the device id is cleaned;
 *  - audio size and mime type are bounded;
 *  - calls are rate-limited per device and globally, and stay under Groq's requests/minute cap;
 *  - the transcript is scrubbed and clamped before it returns to the app;
 *  - expected failures return an error code instead of throwing, and logs never contain keys, audio or text.
 *
 * Convex env vars (see AGENTS.md):
 *   STT_API_KEY   required, Groq API key
 *   STT_BASE_URL  optional, default https://api.groq.com/openai/v1
 *   STT_MODEL     optional, default whisper-large-v3-turbo
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";

const MIN_BYTES = 1500;
const MAX_BYTES = 1_000_000;
const MAX_TEXT = 300;
const PER_MINUTE_GLOBAL = 18; // Groq allows 20 requests/minute; keep headroom.
const PER_DEVICE_PER_HOUR = 40;
const GLOBAL_PER_HOUR = 600;
const TIMEOUT_MS = 20_000;
const PROMPT =
  "Fettle workout coach. Commands like: upper body, lower body, full body, shuffle my exercises, make it 30 minutes, I want to lose weight, build muscle, strength workout.";

/** Whisper often hallucinates these on silence or noise. */
const HALLUCINATIONS = new Set(["thank you", "thanks for watching", "you", "bye"]);

/** Accepted mime types (without codecs) mapped to the file extension sent to the API. */
const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
};

export const allow = internalMutation({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const now = Date.now();
    const minuteAgo = now - 60_000;
    const hourAgo = now - 3_600_000;

    const recent = await ctx.db
      .query("sttCalls")
      .withIndex("by_creation_time", (q) => q.gt("_creationTime", minuteAgo))
      .take(PER_MINUTE_GLOBAL + 1);
    if (recent.length >= PER_MINUTE_GLOBAL) return false;

    const mine = await ctx.db
      .query("sttCalls")
      .withIndex("by_device", (q) => q.eq("deviceId", deviceId).gt("_creationTime", hourAgo))
      .take(PER_DEVICE_PER_HOUR + 1);
    if (mine.length >= PER_DEVICE_PER_HOUR) return false;

    const all = await ctx.db
      .query("sttCalls")
      .withIndex("by_creation_time", (q) => q.gt("_creationTime", hourAgo))
      .take(GLOBAL_PER_HOUR + 1);
    if (all.length >= GLOBAL_PER_HOUR) return false;

    await ctx.db.insert("sttCalls", { deviceId });
    return true;
  },
});

/** Keep strings short and free of control characters and markup-like brackets. */
const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f<>{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, max).trim();

export const transcribe = action({
  args: {
    deviceId: v.string(),
    audio: v.bytes(),
    mimeType: v.string(),
  },
  handler: async (ctx, { deviceId, audio, mimeType }) => {
    const key = process.env.STT_API_KEY;
    if (!key) return { error: "not-configured" as const };

    const id = clean(deviceId, 64);
    if (!id) return { error: "bad-request" as const };
    if (audio.byteLength < MIN_BYTES || audio.byteLength > MAX_BYTES) return { error: "bad-request" as const };
    const mime = mimeType.split(";")[0].trim().toLowerCase();
    const ext = EXTENSIONS[mime];
    if (!ext) return { error: "bad-request" as const };

    if (!(await ctx.runMutation(internal.stt.allow, { deviceId: id }))) return { error: "limit" as const };

    const base = process.env.STT_BASE_URL ?? "https://api.groq.com/openai/v1";
    const form = new FormData();
    form.append("file", new Blob([audio], { type: mime }), `audio.${ext}`);
    form.append("model", process.env.STT_MODEL ?? "whisper-large-v3-turbo");
    form.append("language", "en");
    form.append("response_format", "json");
    form.append("temperature", "0");
    form.append("prompt", PROMPT);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${base}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: controller.signal,
      });
      if (res.status === 429) return { error: "limit" as const };
      if (!res.ok) {
        console.log("stt: upstream status", res.status);
        return { error: "unavailable" as const };
      }

      const json = (await res.json()) as { text?: unknown };
      const raw = typeof json.text === "string" ? clean(json.text, MAX_TEXT) : "";
      const normalized = raw.toLowerCase().replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "");
      if (!normalized || HALLUCINATIONS.has(normalized)) return { text: "" };
      return { text: raw };
    } catch {
      console.log("stt: request failed or timed out");
      return { error: "unavailable" as const };
    } finally {
      clearTimeout(timer);
    }
  },
});
