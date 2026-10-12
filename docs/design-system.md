# Fettle design system

Fettle should look as clean as Apple Health, with more personality. The canvas is warm paper with white cards, ember orange is the brand color, the titles use a grotesque with some character, and the muscle figure sits on a black "night stage". Light and dark modes both follow the OS.

Code lives in `src/design/`: `tokens.ts` (values), `theme.tsx` (`ThemeProvider`, `useTheme`), `brand.tsx` (logo and wordmark), `components.tsx` and `screen.tsx` (components), and `preview-screen.tsx` (everything rendered on one screen, at `/design`). Import everything from `@/design`.

## Brand

- **Name:** Fettle, from "in fine fettle", meaning in good shape. The tagline is "Train what's ready." Other names I considered were Tessera and Sinew.
- **Mark:** three rounded tiles that form an F: a cream (or night) stem, an ember top bar and an amber middle bar. It's built from Views so the tiles can drop in one by one on the splash screen (`AnimatedMark`).
- **Wordmark:** the mark plus "fettle" in lowercase Bricolage Grotesque ExtraBold.
- **Splash:** the native splash is a solid night `#0E0D10`. In the app, `BrandSplash` (`src/features/brand`) animates the tiles, fades the name in, then fades the whole layer away.

## Principles

1. **Numbers first.** A card leads with one metric in the display face. Labels are short nouns.
2. **Color means something.** Ember is for the brand and training, green for nutrition, blue for body, iris for the coach. Buttons are ink. The ember `brand` button is used once per screen, for the hero action.
3. **One idea per card.**
4. **Honest data.** A missing value shows "–". Fatigue is always labeled as estimated from your sets.

## Color

| Token | Light | Dark |
|---|---|---|
| background | `#F4F2EE` warm paper | `#000000` |
| surface / surfaceRaised | `#FFFFFF` | `#161517` / `#222124` |
| fill / fillStrong | `#ECE9E3` / `#DDD9D1` | `#242326` / `#333236` |
| separator | `#E6E2DB` | `#2C2B2F` |
| text / secondary / tertiary | `#16140F` / `#6B675F` / `#A6A197` | `#F6F4F0` / `#A09C94` / `#5F5C57` |
| ink / onInk | `#16140F` / `#FFF` | `#F6F4F0` / `#16140F` |

**Brand:** ember `#FF5A36`, emberDeep `#E2401E`, emberSoft `#FFE4DB`, night `#0E0D10`, cream `#F4F2EE`.

**Categories:**

| Category | Light | Dark |
|---|---|---|
| training | `#FF5A36` | `#FF6A47` |
| nutrition | `#3DAA5C` | `#58C774` |
| body | `#2E7BF6` | `#4B91FF` |
| coach | `#7357FF` | `#9580FF` |

**Macros:** protein is iris, carbs amber `#F2A516`, fat pink `#EE6FA0`. Macros always carry a label.

**Night stage** (muscle figure, same in both modes):

| Part | Color |
|---|---|
| background | `#0E0D10` |
| resting muscle | `#38373D` |
| separation lines | `#5A5960` (the silhouette shows through the gaps) |
| head | `#CFCDD3` |
| hands, feet, knees | `#2E2D33` |
| selected muscle | white outline |

**Fatigue ramp:** Fresh is the resting muscle color, then Light amber `#F7B955`, Worked ember `#FF6A3D` and Heavy crimson `#E5243F`. `FatigueLegend` always appears with the figure.

**Status:** good `#2FA84F`, warning `#F2A516`, critical `#E5243F`. Always shown with a word.

## Typography

Fonts are loaded in `app/_layout.tsx` and the native splash stays up until they're ready. Custom fonts carry their weight in the family name, so never set `fontWeight`.

| Variant | Font | Size/line |
|---|---|---|
| display | Bricolage ExtraBold | 44/46, −1.2 (splash, onboarding hero) |
| largeTitle / title1 / title2 | Bricolage Bold | 34, 28, 22 |
| title3 | Bricolage SemiBold | 19 (card titles) |
| headline | Inter SemiBold | 16 |
| body / callout / subhead | Inter Regular | 16, 15, 14 |
| footnote / caption | Inter Medium | 13, 11.5 |
| metricXL / metric / metricS | Bricolage, tabular | 56, 34, 22 |
| unit | Inter Medium | 14, secondary |

Never use all caps.

## Spacing, radii, elevation, motion

- **Spacing:** 4-pt grid with a 16 gutter, 16 card padding, 12 gap between grid items and 24 between sections.
- **Radii:** xs 8, sm 12, md 16, lg 24 (cards), xl 30 (tab bar, hero bottoms), pill.
- **Elevation:** light mode uses warm-tinted shadows (`#3B2A1A`). Dark mode uses lighter surfaces and hairline borders instead.
- **Motion:** 150, 250 and 400 ms. Pressed controls scale to 0.97. Onboarding steps slide in. The splash tiles use springs.

## Components

- **Text, Card, Button, StatTile, RingStack/RingLegend, BarChart, LineChart, Sparkline, SplitBar, ProgressBar, SegmentedControl, ListRow, TextField:** same anatomy as before, now on the new tokens. Button has `primary` (ink), `brand` (ember), `secondary`, `tertiary` and `destructive` variants. Card titles use title3.
- **Chip:** a pill toggle. When selected it fills with ink, or with an accent if you pass `color`.
- **OptionCard:** a large single-choice row with a glyph tile and a radio ring in ember.
- **Avatar:** an ember circle with the user's initial. It sits top right on every tab and opens Profile.
- **IconButton, Stepper:** a round header button, and a − value + control.
- **Screen:** a large title with an optional right accessory. **SheetScreen:** a title, a close button and a pinned footer, used for modals (Profile, Log meal, Workout). **SectionLabel:** a title3 heading between cards.
- **TabBar:** a floating bar with Today, Train, Eat and Gear around the iris voice button. The active tab gets an ember dot.
- **MuscleMap** (`src/features/body`): the anatomical front and back figure, with every muscle its own region. Tapping a muscle opens `/muscle/[id]`. **BodyCard** is the map on the night stage with a summary line and the legend.

## Signature components

These live in `src/design/signature.tsx` and give Fettle its own feel. Each one gives a light haptic tick on native.

- **BareField:** a big, boxless text input (Bricolage 36) for one-question screens. Its only chrome is an ember underline that grows while focused.
- **ChoiceTile:** a large selectable tile with an icon square that turns ember when chosen and a check that springs in. `compact` makes a square tile for the gear grid. Tiles fade in one after another.
- **RulerPicker:** a horizontal ruler you scrub, with the value huge above a fixed ember needle. Used for body weight and session length.
- **BigStepper:** a big number with round − and + buttons, for targets.
- **StepBar:** segmented progress; each segment fills smoothly.
- **WeekTiles:** the last 7 days as mosaic tiles. Ember fills a tile by how much you trained that day, a green dot means food was logged, and today is outlined.
- **IconCarousel:** the step indicator, a 3D wheel of step icons. The previous step sits on the left, the current one is large and ember in the centre, and the next is on the right. Moving between steps turns the wheel.
- **MeasureField, ActivityBars:** a big centred number on an underline with its unit, with an inline red message when it's outside the allowed range; and a row of rising bars where the chosen one grows tall and ember.
- **DemoBadge:** a night pill reading "Demo mode · Leave".
- **VoiceOrb** (`src/features/voice`): three soft colour blobs (iris, ember, blue) drifting inside a sphere. Its energy follows mic volume while listening.

## Flows

- **Welcome:** a night screen with a muscle figure that cycles through sessions. It offers Create an account, Try the demo, and Sign in.
- **Sign up, then onboarding:** one question per screen (`QuestionFrame`). Each screen has back on the left (and Skip or Sign in on the right), a small centred title and subtitle, and the `IconCarousel` of step icons. One big answer is centred in the empty middle, and a pill Continue stays grey until the answer is valid, then turns ember. The steps are: email, password, name, goal, experience, daily activity (`ActivityBars`), measurements (`MeasureField` for kg and cm, skippable), workout details (equipment chips and workouts per week), gear grid, session length (ruler), targets (suggested from weight and activity), and a programme reveal such as "Intermediate Upper / Lower".
- **Voice coach:** a full-screen night overlay over any tab, opened from the mic button. It starts listening right away. Your words appear large, the coach's reply fades in below them, and suggestions and "Type instead" sit at the bottom. Where speech isn't available (Expo Go), it opens straight to typing.

## Input limits

Numeric fields use `src/lib/validate.ts`. Weight must be 30–250 kg and height 120–230 cm. A meal can be up to 5000 kcal and 500 g per macro. A logged set can be up to 500 kg and 100 reps, and set fields are capped as you type. Fields show the allowed range inline in red, and Continue or Save stays disabled until everything is valid.
