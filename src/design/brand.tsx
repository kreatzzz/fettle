/**
 * Fettle brand: the tile "F" mark and the wordmark.
 * The mark is three rounded tiles, built from Views so each tile can animate
 * on the splash screen (see AnimatedMark).
 */
import { useEffect } from "react";
import { Text as RNText, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "./theme";
import { fonts } from "./tokens";

export const BRAND_NAME = "Fettle";
export const BRAND_TAGLINE = "Train what's ready.";

/** Tile layout on a 48-unit grid: stem, top bar, middle bar. */
const TILES = [
  { x: 6, y: 6, w: 13, h: 36, tone: "stem" },
  { x: 22, y: 6, w: 20, h: 13, tone: "ember" },
  { x: 22, y: 22, w: 13, h: 11, tone: "amber" },
] as const;

function tileStyle(tile: (typeof TILES)[number], unit: number, stem: string, ember: string, amber: string): ViewStyle {
  return {
    position: "absolute",
    left: tile.x * unit,
    top: tile.y * unit,
    width: tile.w * unit,
    height: tile.h * unit,
    borderRadius: 5.5 * unit,
    backgroundColor: tile.tone === "stem" ? stem : tile.tone === "ember" ? ember : amber,
  };
}

/** Static mark. `tone="light"` for dark backgrounds. */
export function Mark({ size = 40, tone }: { size?: number; tone?: "light" | "dark" }) {
  const { colors, scheme } = useTheme();
  const onDark = (tone ?? (scheme === "dark" ? "light" : "dark")) === "light";
  const unit = size / 48;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${BRAND_NAME} logo`}>
      {TILES.map((tile, i) => (
        <View key={i} style={tileStyle(tile, unit, onDark ? colors.brand.cream : colors.brand.night, colors.brand.ember, colors.fatigue[0])} />
      ))}
    </View>
  );
}

/** Mark whose tiles drop in one after another. Used by the splash screen. */
export function AnimatedMark({ size = 96, onDone }: { size?: number; onDone?: () => void }) {
  const { colors } = useTheme();
  const unit = size / 48;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${BRAND_NAME} logo`}>
      {TILES.map((tile, i) => (
        <AnimatedTile
          key={i}
          index={i}
          style={tileStyle(tile, unit, colors.brand.cream, colors.brand.ember, colors.fatigue[0])}
          onDone={i === TILES.length - 1 ? onDone : undefined}
        />
      ))}
    </View>
  );
}

function AnimatedTile({ index, style, onDone }: { index: number; style: ViewStyle; onDone?: () => void }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(120 + index * 140, withSpring(1, { damping: 14, stiffness: 180 }));
    if (!onDone) return;
    const id = setTimeout(onDone, 120 + index * 140 + 700);
    return () => clearTimeout(id);
  }, [index, onDone, progress]);
  const animated = useAnimatedStyle(() => ({
    opacity: withTiming(progress.value > 0.05 ? 1 : 0, { duration: 120 }),
    transform: [{ translateY: (1 - progress.value) * -18 }, { scale: 0.6 + progress.value * 0.4 }],
  }));
  return <Animated.View style={[style, animated]} />;
}

/** Mark + name, side by side. */
export function Wordmark({ size = 28, tone }: { size?: number; tone?: "light" | "dark" }) {
  const { colors, scheme } = useTheme();
  const onDark = (tone ?? (scheme === "dark" ? "light" : "dark")) === "light";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.3 }}>
      <Mark size={size} tone={tone} />
      <RNText
        style={{
          fontFamily: fonts.displayHeavy,
          fontSize: size * 0.95,
          lineHeight: size * 1.1,
          letterSpacing: -size * 0.04,
          color: onDark ? colors.brand.cream : colors.brand.night,
        }}
      >
        {BRAND_NAME.toLowerCase()}
      </RNText>
    </View>
  );
}
