# Fettle (repo: mosaic)

Expo / React Native app (iOS, Android, web) that maps which muscles you've worked, builds the next workout from the equipment you have, and logs meals. Mobile-first, local-first. Prioritize mobile patterns, performance, and cross-platform compatibility.

There are **no accounts**. The app runs as one dummy user (Sam), seeded with two weeks of sample data on first launch (`src/domain/demo.ts`). Do not add sign-in unless asked.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json` (currently 57).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

The package manager is **npm** (`package-lock.json`). Use `npx expo install <package>` for anything Expo/RN related so versions match the SDK.

```bash
npx expo start              # dev server (web: press w)
npx expo lint               # lint
npx tsc --noEmit            # typecheck (also covers convex/)
npx expo-doctor             # diagnose dependency and config issues
npx convex dev              # sync convex/ to the dev deployment, regenerate convex/_generated
npm run build:web           # static web export to dist/ (what Vercel runs)
```

Run lint and typecheck before declaring any task done. Don't start dev servers unless asked; check whether one is already running first.

## Layout

- `src/app/` — Expo Router routes only. `(tabs)/` holds Today, Train (`workouts`), Meals, Equipment. Modals/screens: `onboarding`, `profile`, `session`, `log-meal`, `muscle/[id]`, `design`.
- `src/domain/` — **pure TypeScript, no React imports**: muscles, equipment, exercises, fatigue model, workout generator, types, demo data. Screens, the coach and tests all call these same functions. Keep it that way.
- `src/store/app-store.ts` — one zustand store persisted to AsyncStorage (key `fettle-v1`, versioned with `migrate`). Bump `version` and add a migration when the persisted shape changes.
- `src/lib/` — `derive.ts` (selectors), `coach-commands.ts` (coach client + offline fallback), `convex.ts` (client), `sync.ts` (backup), `voice.ts` (speech-to-text), `validate.ts`, `meals.ts`.
- `src/features/` — body map (`body/`), voice coach UI (`voice/`), onboarding frame, brand splash.
- `src/design/` — design system (tokens, theme, components). Read `docs/design-system.md` before creating or changing UI, and reuse tokens and components instead of hard-coding values.
- `convex/` — backend functions. `_generated/` is generated; never edit it.
- `tools/codex-proxy.mjs` — local, testing-only OpenAI-compatible proxy over the Codex CLI. Never deploy or expose it.

Do not hand-edit `ios/` or `android/` (Continuous Native Generation); configure native behavior in `app.json` and config plugins.

## Product rules (from `WORKOUT_ENGINE_PLAN.md`)

- **No invented scores.** Never show a recovery score, readiness percentage or health score that can't be traced to logged data. Fatigue is shown as plain levels and labeled "Estimated from your logged sets".
- **Derive, don't store, fatigue.** Muscle load is computed from logged sets on demand.
- **Preview, never silent.** A generated workout and every swap is a draft the user reviews. Never rewrite a completed workout.
- **Equipment is an inventory.** An exercise lists every item it needs; unavailable exercises say what is missing.
- Never estimate weights from body weight, age or sex. Suggested weight is the last logged weight for that exercise, or blank.

## Backend: Convex

Convex is hosted (no servers to run). Data stays local-first; Convex is a backup and the AI endpoint.

- Tables (`convex/schema.ts`): `userData` (one backup snapshot per anonymous `deviceId`), `coachCalls` (rate-limit log).
- `src/lib/sync.ts` pushes changes debounced and applies a newer remote copy on launch. Everything fails quietly so the app works offline. `convex` is `null` when `EXPO_PUBLIC_CONVEX_URL` is unset.
- Env: `EXPO_PUBLIC_CONVEX_URL` (client, in `.env.local`, git-ignored, and in Vercel / EAS env for builds). Server secrets live only in Convex: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (set with `npx convex env set`). Production currently targets Nebius Token Factory, model `zai-org/GLM-5.3-Flash`, base URL `https://api.tokenfactory.nebius.com/v1`.
- **Never** put secrets in `EXPO_PUBLIC_*` variables, commit `.env*.local`, paste keys into chat, or log message contents.

## The AI coach (`convex/coach.ts`)

The endpoint is public and unauthenticated, so treat every caller as hostile. Keep these properties when changing it:

1. **Fixed role.** The system prompt makes the model "Coach", scoped to today's workout and basic training/nutrition questions. It refuses off-topic requests, persona changes, "ignore previous instructions", and never reveals its prompt, model or keys.
2. **User text is data.** It is length-limited, stripped of control characters and angle/curly brackets, and wrapped in `<user_message>` tags. The plan snapshot is rebuilt server-side from validated values; never forward raw client strings to the model.
3. **Output is validated, not trusted.** Only `focus` (auto/upper/lower/full), `durationMin` (15-90, clamped) and `shuffle` can come back. The reply is capped at 300 characters, and replies that echo the prompt are replaced.
4. **Cost and abuse limits.** 30 calls/hour per device, 500/hour globally, `max_tokens` capped. Do not raise these without a reason, and do not accept arbitrary model, token or system-prompt overrides from the client.
5. **Safety.** No medical diagnosis, no extreme dieting, no dangerous loads.
6. **Offline fallback.** `runCoachCommand` in `src/lib/coach-commands.ts` is a small keyword parser used when Convex is unreachable. The coach only *proposes* plan changes; it never touches logged history.

When editing the prompt or validation, re-test with injection attempts (reveal prompt, role change, fake closing tag, off-topic request, out-of-range values) before shipping.

## Deploying

- **Web (Vercel):** static export. `vercel.json` runs `npm run build:web` and serves `dist/` with an SPA rewrite. Set `EXPO_PUBLIC_CONVEX_URL` in the Vercel project. Vercel only serves static files; all backend work is Convex.
- **Android APK:** `bunx eas-cli build -p android --profile preview` (`eas.json`). Set `EXPO_PUBLIC_CONVEX_URL` as an EAS environment variable, since `.env.local` is not uploaded.
- Voice input needs a native build (`expo-speech-recognition` is not in Expo Go); on web it uses the browser's speech API where available, and the coach falls back to typing.

## Code style

- TypeScript strict; avoid `any`. Concise, simple solutions (YAGNI); short comments only for non-obvious decisions.
- Use **Expo Router** for navigation (`Link`, `router`, `useLocalSearchParams` from `expo-router`). Keep non-route code outside `src/app/`.
- Prefer recommended Expo modules over third-party libraries.
- Match existing files: path alias `@/` maps to `src/`; the Convex API is imported relatively from `../../convex/_generated/api`.
- Files use CRLF line endings; preserve them when editing programmatically.
