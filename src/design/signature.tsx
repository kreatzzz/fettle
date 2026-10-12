/**
 * Fettle's signature components: the pieces that give the app its own feel.
 * Spec: docs/design-system.md › Signature components.
 */
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  Text as RNText,
  ScrollView,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextInputProps,
} from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Text } from "./components";
import { useTheme } from "./theme";
import { fonts, motion, radius, space, type } from "./tokens";

// Inputs here carry their own focus styling; drop the browser's focus box on web.
const webNoOutline = (Platform.OS === "web" ? { outlineStyle: "none" } : {}) as object;

const tick = () => {
  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
};

/* ------------------------------------------------------------ BareField */

/**
 * Big, boxless text input for one-question screens. The only chrome is an
 * underline that grows in ember while focused.
 */
export function BareField({
  value,
  onChangeText,
  placeholder,
  center,
  ...rest
}: TextInputProps & { value: string; onChangeText: (v: string) => void; /** Centre the text, for one-input screens. */ center?: boolean }) {
  const { colors } = useTheme();
  const focus = useSharedValue(0);
  const line = useAnimatedStyle(() => ({ transform: [{ scaleX: 0.15 + focus.value * 0.85 }], opacity: 0.35 + focus.value * 0.65 }));
  return (
    <View style={{ gap: space[3] }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        onFocus={() => focus.set(withTiming(1, { duration: motion.base }))}
        onBlur={() => focus.set(withTiming(0, { duration: motion.base }))}
        selectionColor={colors.brand.ember}
        style={{ fontFamily: fonts.display, fontSize: 36, lineHeight: 44, letterSpacing: -0.8, color: colors.text, paddingVertical: space[2], minWidth: 0, textAlign: center ? "center" : "left", ...webNoOutline }}
        {...rest}
      />
      <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.fill, overflow: "hidden" }}>
        <Animated.View style={[{ height: 3, borderRadius: 2, backgroundColor: colors.brand.ember, transformOrigin: center ? "center" : "left" }, line]} />
      </View>
    </View>
  );
}

/* ----------------------------------------------------------- ChoiceTile */

/** Large selectable tile. `compact` makes a square tile for grids (gear). */
export function ChoiceTile({
  title,
  detail,
  icon,
  selected,
  onPress,
  compact,
}: {
  title: string;
  detail?: string;
  icon?: (color: string) => ReactNode;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const { colors, elevation } = useTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconColor = selected ? "#FFFFFF" : colors.text;
  return (
    <Animated.View style={[compact ? { width: "31%" } : null, pressStyle]}>
      <Pressable
        accessibilityRole={compact ? "checkbox" : "radio"}
        accessibilityState={compact ? { checked: selected } : { selected }}
        accessibilityLabel={title}
        onPressIn={() => scale.set(withSpring(0.96, motion.spring))}
        onPressOut={() => scale.set(withSpring(1, motion.spring))}
        onPress={() => {
          tick();
          onPress();
        }}
        style={[
          {
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: selected ? colors.brand.ember : "transparent",
            padding: compact ? space[4] : space[5],
            gap: compact ? space[3] : space[4],
            flexDirection: compact ? "column" : "row",
            alignItems: compact ? "flex-start" : "center",
            minHeight: compact ? 104 : 84,
          },
          elevation.card,
        ]}
      >
        {icon ? (
          <View
            style={{
              width: compact ? 40 : 48,
              height: compact ? 40 : 48,
              borderRadius: radius.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? colors.brand.ember : colors.fill,
            }}
          >
            {icon(iconColor)}
          </View>
        ) : null}
        <View style={{ flex: compact ? undefined : 1, gap: 2 }}>
          <Text variant={compact ? "footnote" : "title3"} style={compact ? { fontFamily: fonts.semibold } : undefined} numberOfLines={2}>
            {title}
          </Text>
          {detail && !compact ? (
            <Text variant="subhead" tone="secondary">
              {detail}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <Animated.View
            entering={FadeIn.duration(150)}
            style={{
              position: compact ? "absolute" : "relative",
              top: compact ? space[3] : undefined,
              right: compact ? space[3] : undefined,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: colors.brand.ember,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Svg width={12} height={12} viewBox="0 0 12 12">
              <Path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/* ---------------------------------------------------------- RulerPicker */

const TICK_GAP = 12;

/**
 * Horizontal ruler you scrub to pick a number (body weight, minutes).
 * The value sits big above a fixed ember needle; ticks scroll underneath.
 */
export function RulerPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  majorEvery = 10,
  unit,
  format = (v) => String(v),
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  /** A labeled major tick every N steps. */
  majorEvery?: number;
  unit?: string;
  format?: (v: number) => string;
}) {
  const { colors } = useTheme();
  const ref = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const last = useRef(value);
  const count = Math.round((max - min) / step) + 1;
  const indexOf = (v: number) => Math.round((Math.min(max, Math.max(min, v)) - min) / step);

  // Put the needle on the starting value once the ruler has a width.
  useEffect(() => {
    if (!width) return;
    ref.current?.scrollTo({ x: indexOf(value) * TICK_GAP, animated: false });
    // Only on layout; scrolling owns the value afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(count - 1, Math.round(e.nativeEvent.contentOffset.x / TICK_GAP)));
    const v = Number((min + i * step).toFixed(2));
    if (v !== last.current) {
      last.current = v;
      tick();
      onChange(v);
    }
  };

  return (
    <View style={{ gap: space[5] }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: space[2] }}>
        <RNText style={[type.metricXL, { fontSize: 72, lineHeight: 76, color: colors.text }]}>{format(value)}</RNText>
        {unit ? <RNText style={[type.title3, { color: colors.textSecondary }]}>{unit}</RNText> : null}
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: 76 }}>
        {width ? (
          <ScrollView
            ref={ref}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TICK_GAP}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={onScroll}
            contentContainerStyle={{ paddingHorizontal: width / 2 - 1, alignItems: "flex-start" }}
          >
            {Array.from({ length: count }, (_, i) => {
              const major = i % majorEvery === 0;
              const half = !major && majorEvery % 2 === 0 && i % (majorEvery / 2) === 0;
              return (
                <View key={i} style={{ width: TICK_GAP, alignItems: "flex-start" }}>
                  <View style={{ width: 2, height: major ? 36 : half ? 26 : 16, borderRadius: 1, backgroundColor: major ? colors.textSecondary : colors.fillStrong }} />
                  {major ? (
                    <RNText style={[type.caption, { color: colors.textSecondary, marginTop: 8, width: 60, marginLeft: -29, textAlign: "center" }]}>
                      {format(min + i * step)}
                    </RNText>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        ) : null}
        {/* Fixed needle */}
        <View pointerEvents="none" style={{ position: "absolute", left: width / 2 - 2, top: -6, width: 4, height: 48, borderRadius: 2, backgroundColor: colors.brand.ember }} />
      </View>
    </View>
  );
}

/* ----------------------------------------------------------- BigStepper */

/** A big number with round − / + buttons, for targets on one-question screens. */
export function BigStepper({ label, value, onChange, step, min, max, unit }: { label: string; value: number; onChange: (v: number) => void; step: number; min: number; max: number; unit: string }) {
  const { colors } = useTheme();
  const bump = (d: number) => {
    tick();
    onChange(Math.min(max, Math.max(min, value + d)));
  };
  const btn = (d: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${d < 0 ? "Decrease" : "Increase"} ${label}`}
      onPress={() => bump(d)}
      hitSlop={6}
      style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}
    >
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Path d={d < 0 ? "M3 9h12" : "M3 9h12M9 3v12"} stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
  return (
    <View style={{ gap: space[3] }}>
      <Text variant="footnote" tone="secondary" style={{ textAlign: "center" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {btn(-step)}
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[2] }}>
          <Animated.Text key={value} entering={FadeIn.duration(160)} style={[type.metric, { fontSize: 44, lineHeight: 50, color: colors.text }]}>
            {value.toLocaleString()}
          </Animated.Text>
          <RNText style={[type.unit, { color: colors.textSecondary }]}>{unit}</RNText>
        </View>
        {btn(step)}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------ StepBar */

/** Thin segmented progress for multi-step flows; the active segment fills with a spring. */
export function StepBar({ step, total }: { step: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: "row", gap: 5 }}>
      {Array.from({ length: total }, (_, i) => (
        <StepSegment key={i} filled={i < step} track={colors.fill} fill={colors.brand.ember} />
      ))}
    </View>
  );
}

function StepSegment({ filled, track, fill }: { filled: boolean; track: string; fill: string }) {
  const p = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(filled ? 1 : 0, { duration: motion.slow });
  }, [filled, p]);
  const style = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: fill }, style]} />
    </View>
  );
}

/* ----------------------------------------------------------- WeekTiles */

export type DayTile = { label: string; sets: number; ate: boolean; today: boolean };

/**
 * The week as a row of mosaic tiles: each fills with ember by how much you
 * trained that day, with a green dot when you logged food.
 */
export function WeekTiles({ days }: { days: DayTile[] }) {
  const { colors } = useTheme();
  // ~20 sets reads as a full day; heavier days just fill the tile.
  const max = Math.max(20, ...days.map((d) => d.sets));
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {days.map((d, i) => {
        const level = d.sets === 0 ? 0 : 0.28 + 0.72 * Math.min(1, d.sets / max);
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: space[2] }}>
            <Animated.View
              style={{
                width: "100%",
                aspectRatio: 0.8,
                borderRadius: radius.sm,
                backgroundColor: colors.fill,
                borderWidth: d.today ? 2 : 0,
                borderColor: colors.text,
                overflow: "hidden",
                justifyContent: "flex-end",
              }}
            >
              {level ? <View style={{ height: `${level * 100}%`, backgroundColor: colors.brand.ember, opacity: 0.35 + level * 0.65 }} /> : null}
              {d.ate ? (
                <View style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.category.nutrition }} />
              ) : null}
            </Animated.View>
            <Text variant="caption" tone={d.today ? "primary" : "secondary"}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ----------------------------------------------------------- DemoBadge */

/** Small pill that says you're in demo mode, with a way out. */
export function DemoBadge({ onLeave }: { onLeave: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Leave demo"
      onPress={onLeave}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: space[2],
        paddingHorizontal: space[4],
        height: 30,
        borderRadius: radius.pill,
        backgroundColor: colors.brand.night,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand.ember }} />
      <RNText style={[type.caption, { color: colors.brand.cream, fontFamily: fonts.semibold }]}>Demo mode</RNText>
      <RNText style={[type.caption, { color: colors.stage.textSecondary }]}>· Leave</RNText>
    </Pressable>
  );
}

/* -------------------------------------------------------- IconCarousel */

/**
 * Step indicator as a 3D wheel of icons: the previous step on the left, the
 * current one large in the centre, the next on the right. Changing step turns
 * the wheel.
 */
export function IconCarousel({ step, icons }: { step: number; icons: ((color: string) => ReactNode)[] }) {
  const { colors } = useTheme();
  const pos = useSharedValue(step);
  useEffect(() => {
    pos.value = withTiming(step, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [step, pos]);
  return (
    <View style={{ height: 76, alignItems: "center", justifyContent: "center" }} accessibilityLabel={`Step ${step + 1} of ${icons.length}`}>
      {icons.map((icon, i) => (
        <CarouselIcon key={i} index={i} pos={pos} active={i === step} done={i < step} icon={icon} ember={colors.brand.ember} fill={colors.fill} ink={colors.textSecondary} />
      ))}
    </View>
  );
}

const ANGLE = 48; // degrees between neighbours on the wheel
const RADIUS = 92; // px, wheel radius in screen space

function CarouselIcon({
  index,
  pos,
  active,
  done,
  icon,
  ember,
  fill,
  ink,
}: {
  index: number;
  pos: SharedValue<number>;
  active: boolean;
  done: boolean;
  icon: (color: string) => ReactNode;
  ember: string;
  fill: string;
  ink: string;
}) {
  const style = useAnimatedStyle(() => {
    const d = index - pos.value;
    const a = (d * ANGLE * Math.PI) / 180;
    const visible = Math.abs(d) < 1.6;
    return {
      opacity: visible ? Math.max(0, 1 - Math.abs(d) * 0.3) : 0,
      zIndex: Math.round(10 - Math.abs(d) * 4),
      transform: [
        { perspective: 600 },
        { translateX: Math.sin(a) * RADIUS },
        { rotateY: `${-d * ANGLE}deg` },
        { scale: 1 - Math.min(1, Math.abs(d)) * 0.38 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: 64,
          height: 64,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? ember : fill,
        },
        style,
      ]}
    >
      {icon(active ? "#FFFFFF" : done ? ember : ink)}
    </Animated.View>
  );
}

/* ---------------------------------------------------------- MeasureField */

/**
 * A big centred number with its unit on one underline, e.g. "72.5 kg".
 * Shows `error` in red under the line instead of the label.
 */
export function MeasureField({
  value,
  onChangeText,
  unit,
  placeholder = "00.0",
  label,
  error,
  maxLength = 5,
}: {
  value: string;
  onChangeText: (v: string) => void;
  unit: string;
  placeholder?: string;
  label: string;
  error?: string | null;
  maxLength?: number;
}) {
  const { colors } = useTheme();
  const line = error ? colors.status.critical : value ? colors.brand.ember : colors.fillStrong;
  return (
    <View style={{ alignItems: "center", gap: space[3] }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", width: 240, borderBottomWidth: 2, borderBottomColor: line, paddingBottom: space[2] }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType="decimal-pad"
          maxLength={maxLength}
          accessibilityLabel={label}
          selectionColor={colors.brand.ember}
          style={[
            { fontFamily: fonts.displayHeavy, fontSize: 52, height: 64, width: 170, textAlign: "right", color: colors.text, padding: 0, fontVariant: ["tabular-nums"] },
            webNoOutline,
          ]}
        />
        <RNText style={[type.title2, { color: colors.textSecondary, width: 60, marginLeft: space[2], marginBottom: space[2] }]}>{unit}</RNText>
      </View>
      <Text variant="footnote" style={{ color: error ? colors.status.critical : colors.textSecondary }}>
        {error ?? label}
      </Text>
    </View>
  );
}

/* ---------------------------------------------------------- ActivityBars */

/**
 * Pick-one row of vertical bars, rising left to right. The chosen bar grows
 * tall and turns ember, and its label shows underneath.
 */
export function ActivityBars<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ gap: space[6], alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space[4], height: 200 }}>
        {options.map((o, i) => (
          <ActivityBar key={o.value} label={o.label} rest={60 + i * 28} on={o.value === value} onPress={() => onChange(o.value)} color={colors.brand.ember} track={colors.fill} />
        ))}
      </View>
      <Animated.Text key={selected?.label ?? "none"} entering={FadeIn.duration(200)} style={[type.title3, { color: selected ? colors.text : colors.textTertiary }]}>
        {selected?.label ?? "Tap a bar"}
      </Animated.Text>
    </View>
  );
}

function ActivityBar({ label, rest, on, onPress, color, track }: { label: string; rest: number; on: boolean; onPress: () => void; color: string; track: string }) {
  const h = useSharedValue(rest);
  useEffect(() => {
    h.value = withSpring(on ? 200 : rest, motion.spring);
  }, [on, rest, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      onPress={() => {
        tick();
        onPress();
      }}
      hitSlop={6}
    >
      <Animated.View style={[{ width: 52, borderRadius: radius.md, backgroundColor: on ? color : track }, style]} />
    </Pressable>
  );
}
