/**
 * Fettle design tokens.
 *
 * One source of truth for color, type, spacing, radii, elevation and motion.
 * Components read tokens through `useTheme()` (see ./theme.tsx); never hard-code hex.
 * Spec and rationale: docs/design-system.md.
 */
import type { TextStyle } from "react-native";

/* ------------------------------------------------------------------ color */

const light = {
  // Warm paper canvas with white cards. Calm like Health, but not clinical gray.
  background: "#F4F2EE",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF", // separated by shadow (elevation.raised)
  fill: "#ECE9E3", // controls, segmented track, input background, ring track
  fillStrong: "#DDD9D1",
  separator: "#E6E2DB",
  overlay: "rgba(20,18,15,0.36)",

  text: "#16140F",
  textSecondary: "#6B675F",
  textTertiary: "#A6A197",
  textInverse: "#FFFFFF",

  // Primary action is ink; the brand ember is reserved for the hero moments.
  ink: "#16140F",
  onInk: "#FFFFFF",
  focus: "#2E7BF6",

  bodyBase: "#2A2A2F",
  bodyStroke: "#3A3A41",
} as const;

const dark: Record<keyof typeof light, string> = {
  background: "#000000",
  surface: "#161517",
  surfaceRaised: "#222124",
  fill: "#242326",
  fillStrong: "#333236",
  separator: "#2C2B2F",
  overlay: "rgba(0,0,0,0.6)",

  text: "#F6F4F0",
  textSecondary: "#A09C94",
  textTertiary: "#5F5C57",
  textInverse: "#16140F",

  ink: "#F6F4F0",
  onInk: "#16140F",
  focus: "#4B91FF",

  bodyBase: "#2A2A2F",
  bodyStroke: "#3A3A41",
};

/** Brand. Ember is Fettle's signature: logo, hero CTAs, the "today" highlight. */
const brand = {
  ember: "#FF5A36",
  emberDeep: "#E2401E",
  emberSoft: "#FFE4DB",
  amber: "#F7B955", // middle bar of the logo mark
  night: "#0E0D10", // splash, onboarding hero, body map stage
  cream: "#F4F2EE",
} as const;

/**
 * Category colors. Each feature area owns one hue, used for its rings, chart
 * marks, icons and glyph backgrounds. Never for body text.
 */
const category = {
  light: { training: "#FF5A36", nutrition: "#3DAA5C", body: "#2E7BF6", coach: "#7357FF" },
  dark: { training: "#FF6A47", nutrition: "#58C774", body: "#4B91FF", coach: "#9580FF" },
} as const;

/** Macros, inside nutrition views only. Always shown with labels. */
const macro = {
  light: { protein: "#7357FF", carbs: "#F2A516", fat: "#EE6FA0" },
  dark: { protein: "#9580FF", carbs: "#F5B436", fat: "#F27FAB" },
} as const;

/**
 * Muscle status traffic light, indexed by fatigue level 0..3. Levels 0 and 1 are
 * ready (green), 2 is recovering (yellow), 3 needs rest (red). Always on the night stage.
 */
const fatigue = ["#3FCF6E", "#3FCF6E", "#F5C842", "#EF4444"] as const;

/** The night "stage" the anatomical figure is drawn on. */
const stage = {
  background: "#0E0D10",
  muscleLine: "#0E0D10", // gaps between muscle heads
  skin: "#CFCDD3", // head
  joint: "#2E2D33", // hands, feet, knees: body, but not trainable
  outline: "#5A5960", // shows through gaps as separation lines
  selected: "#FFFFFF",
  text: "#F6F4F0",
  textSecondary: "#9C98A3",
} as const;

/** Status. Always paired with an icon and a label, never color alone. */
const status = { good: "#2FA84F", warning: "#F2A516", critical: "#E5243F" } as const;

export type ColorScheme = "light" | "dark";
export type CategoryKey = keyof typeof category.light;
export type MacroKey = keyof typeof macro.light;

export function palette(scheme: ColorScheme) {
  return {
    ...(scheme === "light" ? light : dark),
    brand,
    category: category[scheme],
    macro: macro[scheme],
    fatigue,
    stage,
    status,
  };
}
export type Palette = ReturnType<typeof palette>;

/* ------------------------------------------------------------- typography */

/**
 * Two families. Bricolage Grotesque gives titles and numbers their character;
 * Inter keeps body copy quiet and legible. Loaded in app/_layout.tsx.
 * Custom fonts carry their weight in the family name, so never set fontWeight.
 */
export const fonts = {
  display: "BricolageGrotesque_700Bold",
  displayHeavy: "BricolageGrotesque_800ExtraBold",
  displayMedium: "BricolageGrotesque_600SemiBold",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

const t = (fontFamily: string, size: number, line: number, tracking = 0): TextStyle => ({
  fontFamily,
  fontSize: size,
  lineHeight: line,
  letterSpacing: tracking,
});
const num: TextStyle = { fontVariant: ["tabular-nums"] };

export const type = {
  display: t(fonts.displayHeavy, 44, 46, -1.2), // splash, onboarding hero
  largeTitle: t(fonts.display, 34, 38, -0.8),
  title1: t(fonts.display, 28, 32, -0.6),
  title2: t(fonts.display, 22, 26, -0.4),
  title3: t(fonts.displayMedium, 19, 24, -0.2),
  headline: t(fonts.semibold, 16, 22, -0.2),
  body: t(fonts.regular, 16, 22, -0.2),
  callout: t(fonts.regular, 15, 20, -0.15),
  subhead: t(fonts.regular, 14, 19, -0.1),
  footnote: t(fonts.medium, 13, 17, -0.05),
  caption: t(fonts.medium, 11.5, 15, 0),
  overline: t(fonts.semibold, 11, 13, 0.6), // small label inside cards, sentence case

  metricXL: { ...t(fonts.displayHeavy, 56, 58, -1.6), ...num },
  metric: { ...t(fonts.display, 34, 38, -0.8), ...num },
  metricS: { ...t(fonts.display, 22, 26, -0.4), ...num },
  unit: t(fonts.medium, 14, 18, 0),
} satisfies Record<string, TextStyle>;
export type TypeVariant = keyof typeof type;

/* ---------------------------------------------------- spacing, radii, size */

/** 4-pt grid. Screen gutter = 16, card padding = 16, gap between sections = 24. */
export const space = { 0: 0, 1: 2, 2: 4, 3: 8, 4: 12, 5: 16, 6: 20, 7: 24, 8: 32, 9: 40, 10: 48 } as const;
export const layout = { gutter: 16, cardPadding: 16, sectionGap: 24, gridGap: 12, minTouch: 44 } as const;

export const radius = { xs: 8, sm: 12, md: 16, lg: 24, xl: 30, pill: 999 } as const;

export const icon = { xs: 16, sm: 20, md: 24, lg: 28, stroke: 1.75 } as const;

/* -------------------------------------------------------------- elevation */

export function elevation(scheme: ColorScheme) {
  if (scheme === "dark") {
    return {
      flat: {},
      card: {},
      raised: { borderWidth: 0.5, borderColor: dark.separator },
      floating: { borderWidth: 0.5, borderColor: dark.fillStrong },
    } as const;
  }
  // Warm-tinted shadows read softer on the paper canvas than pure black.
  const shadow = (y: number, blur: number, opacity: number, androidElevation: number) => ({
    shadowColor: "#3B2A1A",
    shadowOffset: { width: 0, height: y },
    shadowRadius: blur / 2,
    shadowOpacity: opacity,
    elevation: androidElevation,
  });
  return {
    flat: {},
    card: shadow(2, 8, 0.05, 1),
    raised: shadow(6, 20, 0.08, 4),
    floating: shadow(10, 36, 0.14, 12),
  } as const;
}

/* ------------------------------------------------------------------ motion */

export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
  spring: { damping: 18, stiffness: 220, mass: 1 },
  pressScale: 0.97,
} as const;
