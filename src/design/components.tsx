/**
 * Mosaic core components. Spec: docs/design-system.md.
 * Depends only on react-native and react-native-svg.
 */
import { useEffect, useState, type ReactNode } from "react";
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import {
  Pressable,
  Text as RNText,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { useTheme } from "./theme";
import { fonts, icon as iconSize, layout, motion, radius, space, type, type CategoryKey, type TypeVariant } from "./tokens";

/* ---------------------------------------------------------------- Text */

type Tone = "primary" | "secondary" | "tertiary" | "inverse";

export function Text({
  variant = "body",
  tone = "primary",
  style,
  ...rest
}: TextProps & { variant?: TypeVariant; tone?: Tone }) {
  const { colors } = useTheme();
  const color = {
    primary: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    inverse: colors.textInverse,
  }[tone];
  return <RNText {...rest} style={[type[variant], { color }, style]} />;
}

/* ---------------------------------------------------------------- Card */

export function Card({
  children,
  style,
  onPress,
  title,
  category,
  accessory,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Optional header. Category tints the title, like Health's summary cards. */
  title?: string;
  category?: CategoryKey;
  accessory?: ReactNode;
}) {
  const { colors, elevation } = useTheme();
  const body = (
    <>
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space[4], gap: space[3] }}>
          {category ? <Dot color={colors.category[category]} /> : null}
          <Text variant="title3" style={{ flex: 1 }}>
            {title}
          </Text>
          {accessory}
        </View>
      ) : null}
      {children}
    </>
  );
  const base: ViewStyle = { backgroundColor: colors.surface, borderRadius: radius.lg, padding: layout.cardPadding };
  if (!onPress) return <View style={[base, elevation.card, style]}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [base, elevation.card, pressed && { transform: [{ scale: motion.pressScale }] }, style]}
    >
      {body}
    </Pressable>
  );
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/* -------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "brand" | "secondary" | "tertiary" | "destructive";

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  icon,
  disabled,
  style,
  textColor,
}: {
  label: string;
  onPress: () => void;
  /** Override the label color, e.g. on the night background. */
  textColor?: string;
  variant?: ButtonVariant;
  size?: "lg" | "sm";
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const bg = { primary: colors.ink, brand: colors.brand.ember, secondary: colors.fill, tertiary: "transparent", destructive: colors.fill }[variant];
  const fg = {
    primary: colors.onInk,
    brand: "#FFFFFF",
    secondary: colors.text,
    tertiary: colors.text,
    destructive: colors.status.critical,
  }[variant];
  const height = size === "lg" ? 52 : 36;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={size === "sm" ? 4 : 0}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: size === "lg" ? space[7] : space[5],
          borderRadius: size === "lg" ? radius.md : radius.pill,
          backgroundColor: bg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: space[3],
          opacity: disabled ? 0.4 : 1,
        },
        pressed && { opacity: 0.8, transform: [{ scale: motion.pressScale }] },
        style,
      ]}
    >
      {icon}
      <RNText style={[size === "lg" ? type.headline : type.subhead, { color: textColor ?? fg, fontFamily: fonts.semibold }]}>{label}</RNText>
    </Pressable>
  );
}

/* ------------------------------------------------------------ StatTile */

export function StatTile({
  label,
  value,
  unit,
  category,
  delta,
  trend,
  style,
}: {
  label: string;
  value: string;
  unit?: string;
  category?: CategoryKey;
  /** e.g. "+2.1 kg vs last week". Plain text: deltas never rely on color. */
  delta?: string;
  /** Optional sparkline values. */
  trend?: number[];
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, elevation } = useTheme();
  const accent = category ? colors.category[category] : colors.text;
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.md, padding: layout.cardPadding, gap: space[2], flex: 1 },
        elevation.card,
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        {category ? <Dot color={accent} size={6} /> : null}
        <Text variant="footnote" tone="secondary">
          {label}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[2] }}>
        <Text variant="metricS">{value}</Text>
        {unit ? (
          <Text variant="unit" tone="secondary">
            {unit}
          </Text>
        ) : null}
      </View>
      {trend ? <Sparkline values={trend} color={accent} /> : null}
      {delta ? (
        <Text variant="caption" tone="secondary">
          {delta}
        </Text>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- Rings */

export type RingDatum = { key: CategoryKey; label: string; progress: number };

/**
 * Concentric progress rings (outer → inner in array order). Progress is 0..1;
 * values past 1 lap the ring with a darker overlap cap, like Activity.
 * Always render RingLegend (or labels) beside it: identity is never color alone.
 */
export function RingStack({ rings, size = 132, stroke = 14 }: { rings: RingDatum[]; size?: number; stroke?: number }) {
  const { colors } = useTheme();
  const gap = 3;
  return (
    <Svg width={size} height={size} accessibilityRole="image">
      {rings.map((ring, i) => {
        const r = size / 2 - stroke / 2 - i * (stroke + gap);
        const c = 2 * Math.PI * r;
        const p = Math.max(0, Math.min(ring.progress, 1));
        const color = colors.category[ring.key];
        return (
          <GroupRing key={ring.key} index={i} cx={size / 2} r={r} stroke={stroke} c={c} p={p} color={color} track={colors.fill} />
        );
      })}
    </Svg>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** One ring; the arc sweeps in from zero on mount and eases to new values. */
function GroupRing(props: { cx: number; r: number; stroke: number; c: number; p: number; color: string; track: string; index: number }) {
  const { cx, r, stroke, c, p, color, track, index } = props;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(120 * index, withTiming(p, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [p, index, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }));
  return (
    <>
      <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {p > 0 ? (
        <AnimatedCircle
          cx={cx}
          cy={cx}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      ) : null}
    </>
  );
}

export function RingLegend({ rings, values }: { rings: RingDatum[]; values: string[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space[4] }}>
      {rings.map((ring, i) => (
        <View key={ring.key} style={{ gap: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
            <Dot color={colors.category[ring.key]} />
            <Text variant="footnote" tone="secondary">
              {ring.label}
            </Text>
          </View>
          <Text variant="metricS" style={{ marginLeft: 16 }}>
            {values[i]}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* --------------------------------------------------------------- Charts */

/** Charts fill their container: pass `width` to pin it, or omit to measure. */
function useWidth(fixed?: number) {
  const [measured, setMeasured] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setMeasured(Math.floor(e.nativeEvent.layout.width));
  return { width: fixed ?? measured, onLayout: fixed ? undefined : onLayout };
}

/**
 * Charts share one anatomy: recessive gridlines (separator), one y-axis,
 * a 4px rounded data end on bars, 2px lines, labels in text tokens.
 */
export function BarChart({
  values,
  labels,
  color,
  highlightIndex,
  height = 140,
  width: fixedWidth,
  goal,
}: {
  values: number[];
  labels: string[];
  color: string;
  highlightIndex?: number;
  height?: number;
  width?: number;
  /** Optional dashed goal line, labeled at the right edge. */
  goal?: number;
}) {
  const { colors, scheme } = useTheme();
  const { width, onLayout } = useWidth(fixedWidth);
  const max = Math.max(...values, goal ?? 0) * 1.1 || 1;
  const plotH = height - 20;
  const slot = width / values.length;
  const barW = Math.min(18, slot - 6);
  const y = (v: number) => plotH - (v / max) * plotH;
  if (!width) return <View onLayout={onLayout} style={{ height }} />;
  return (
    <View onLayout={onLayout}>
      <Svg width={width} height={plotH}>
        {[0.5, 1].map((f) => (
          <Line key={f} x1={0} x2={width} y1={plotH * (1 - f)} y2={plotH * (1 - f)} stroke={colors.separator} strokeWidth={1} />
        ))}
        <Line x1={0} x2={width} y1={plotH - 0.5} y2={plotH - 0.5} stroke={colors.fillStrong} strokeWidth={1} />
        {values.map((v, i) => {
          const h = Math.max(plotH - y(v), v > 0 ? 4 : 0);
          const x = i * slot + (slot - barW) / 2;
          const dim = highlightIndex !== undefined && highlightIndex !== i;
          return <Path key={i} d={roundedTopBar(x, plotH - h, barW, h, 4)} fill={color} opacity={dim ? (scheme === "dark" ? 0.45 : 0.35) : 1} />;
        })}
        {goal ? (
          <Line x1={0} x2={width} y1={y(goal)} y2={y(goal)} stroke={colors.textSecondary} strokeWidth={1} strokeDasharray="3 4" />
        ) : null}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: space[2] }}>
        {labels.map((l, i) => (
          <Text key={i} variant="caption" tone="secondary" style={{ width: slot, textAlign: "center" }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

function roundedTopBar(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export function LineChart({
  values,
  color,
  width: fixedWidth,
  height = 120,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const { width, onLayout } = useWidth(fixedWidth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.15 || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (width - 8) + 4,
    height - 4 - ((v - min + pad) / (max - min + pad * 2)) * (height - 8),
  ]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  if (!width) return <View onLayout={onLayout} style={{ height }} />;
  return (
    <View onLayout={onLayout}>
    <Svg width={width} height={height}>
      {[0.25, 0.5, 0.75].map((f) => (
        <Line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke={colors.separator} strokeWidth={1} />
      ))}
      <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={lx} cy={ly} r={5} fill={color} stroke={colors.surface} strokeWidth={2} />
    </Svg>
    </View>
  );
}

export function Sparkline({ values, color, width = 120, height = 28 }: { values: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const d = values
    .map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * (width - 4) + 2).toFixed(1)},${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Horizontal stacked bar for macros or any 2–3 part split. 2px surface gap between parts. */
export function SplitBar({ parts, height = 10 }: { parts: { value: number; color: string }[]; height?: number }) {
  const { colors } = useTheme();
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <View style={{ flexDirection: "row", height, gap: 2, borderRadius: height / 2, overflow: "hidden", backgroundColor: colors.surface }}>
      {parts.map((p, i) => (
        <View key={i} style={{ flex: p.value / total, backgroundColor: p.color }} />
      ))}
    </View>
  );
}

/** Fresh → heavy legend for the muscle map. Drawn on the night stage. */
export const FATIGUE_LABELS = ["Fresh", "Light", "Worked", "Heavy"] as const;

export function FatigueLegend() {
  const { colors } = useTheme();
  const steps = [colors.stage.muscle, ...colors.fatigue];
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: space[5], flexWrap: "wrap" }}>
      {steps.map((c, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c, borderWidth: i === 0 ? 1 : 0, borderColor: colors.stage.outline }} />
          <RNText style={[type.caption, { color: colors.stage.textSecondary }]}>{FATIGUE_LABELS[i]}</RNText>
        </View>
      ))}
    </View>
  );
}

/* -------------------------------------------------------- Inputs/controls */

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  error,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  unit?: string;
  error?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "email-address";
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space[2] }}>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 48,
          paddingHorizontal: space[5],
          borderRadius: radius.sm,
          backgroundColor: colors.fill,
          borderWidth: 1.5,
          borderColor: error ? colors.status.critical : focused ? colors.focus : "transparent",
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          style={[type.body, { flex: 1, minWidth: 0, color: colors.text, paddingVertical: space[4] } as TextStyle]}
        />
        {unit ? (
          <Text variant="subhead" tone="secondary">
            {unit}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="footnote" style={{ color: colors.status.critical }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors, elevation, scheme } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 2, borderRadius: radius.sm, backgroundColor: colors.fill }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[
              { flex: 1, height: 32, alignItems: "center", justifyContent: "center", borderRadius: radius.sm - 2 },
              selected && [{ backgroundColor: scheme === "dark" ? colors.fillStrong : colors.surface }, elevation.card],
            ]}
          >
            <Text variant="footnote" style={{ fontFamily: selected ? fonts.semibold : fonts.medium }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListRow({
  title,
  detail,
  value,
  leading,
  onPress,
  last,
}: {
  title: string;
  detail?: string;
  value?: string;
  leading?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space[4], minHeight: 52, opacity: pressed ? 0.6 : 1 })}
    >
      {leading}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "stretch",
          borderBottomWidth: last ? 0 : 0.5,
          borderBottomColor: colors.separator,
          paddingVertical: space[4],
          gap: space[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="body">{title}</Text>
          {detail ? (
            <Text variant="footnote" tone="secondary">
              {detail}
            </Text>
          ) : null}
        </View>
        {value ? (
          <Text variant="body" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
            {value}
          </Text>
        ) : null}
        {onPress ? <Chevron color={colors.textTertiary} /> : null}
      </View>
    </Pressable>
  );
}

export function Chevron({ color }: { color: string }) {
  return (
    <Svg width={8} height={14} viewBox="0 0 8 14">
      <Path d="M1 1l6 6-6 6" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Rounded-square glyph behind a category icon (list rows, card headers). */
export function IconBadge({ category, children, size = 30 }: { category: CategoryKey; children: ReactNode; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.xs + 2,
        backgroundColor: colors.category[category],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}

/* --------------------------------------------------------------- Tab bar */

export type TabItem = { key: string; label: string; icon: (color: string, size: number) => ReactNode };

/**
 * Floating tab bar: 4 tabs plus a centered voice coach button.
 * Pass to Expo Router's `tabBar` prop; this component only draws it.
 */
export function TabBar({
  tabs,
  active,
  onSelect,
  onVoice,
  bottomInset = 0,
}: {
  tabs: TabItem[];
  active: string;
  onSelect: (key: string) => void;
  onVoice: () => void;
  bottomInset?: number;
}) {
  const { colors, elevation, scheme } = useTheme();
  const half = Math.ceil(tabs.length / 2);
  const renderTab = (tab: TabItem) => {
    const selected = tab.key === active;
    const color = selected ? colors.text : colors.textSecondary;
    return (
      <Pressable
        key={tab.key}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={tab.label}
        onPress={() => onSelect(tab.key)}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2, minHeight: layout.minTouch }}
      >
        {tab.icon(color, iconSize.md)}
        <View style={{ position: "absolute", top: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: selected ? colors.brand.ember : "transparent" }} />
        <RNText style={[type.caption, { color, fontFamily: selected ? fonts.semibold : fonts.medium, fontSize: 10, lineHeight: 12 }]}>{tab.label}</RNText>
      </Pressable>
    );
  };
  return (
    <View style={{ paddingHorizontal: space[5], paddingBottom: Math.max(bottomInset, space[3]) }}>
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            height: 64,
            borderRadius: radius.xl,
            paddingHorizontal: space[3],
            backgroundColor: scheme === "dark" ? colors.surfaceRaised : colors.surface,
          },
          elevation.floating,
        ]}
      >
        {tabs.slice(0, half).map(renderTab)}
        <VoiceButton onPress={onVoice} />
        {tabs.slice(half).map(renderTab)}
      </View>
    </View>
  );
}

/** The AI coach entry. Coach violet, mic glyph, 48pt. */
export function VoiceButton({ onPress, size = 48 }: { onPress: () => void; size?: number }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Talk to coach"
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.category.coach,
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: space[3],
        transform: [{ scale: pressed ? motion.pressScale : 1 }],
      })}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round">
        <Rect x={9} y={3} width={6} height={12} rx={3} />
        <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </Svg>
    </Pressable>
  );
}

/* ----------------------------------------------------------------- Chip */

/** Pill chip. With `onPress` it becomes a toggle; `selected` fills it with ink. */
export function Chip({
  label,
  selected,
  onPress,
  leading,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leading?: ReactNode;
  /** Optional accent for the selected fill (defaults to ink). */
  color?: string;
}) {
  const { colors } = useTheme();
  const bg = selected ? (color ?? colors.ink) : colors.fill;
  const fg = selected ? colors.onInk : colors.text;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space[2],
        paddingHorizontal: space[4],
        minHeight: 36,
        borderRadius: radius.pill,
        backgroundColor: bg,
        transform: [{ scale: pressed ? motion.pressScale : 1 }],
      })}
    >
      {leading}
      <RNText style={[type.footnote, { color: fg, fontFamily: selected ? fonts.semibold : fonts.medium }]}>{label}</RNText>
    </Pressable>
  );
}

/** Thin progress bar for a value against a target (macros, goals). */
export function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: "hidden" }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${Math.max(0, Math.min(progress, 1)) * 100}%` }} />
    </View>
  );
}

/** Quiet empty state inside a card: one line, no illustration. */
export function EmptyState({ label }: { label: string }) {
  return (
    <View style={{ paddingVertical: space[7], alignItems: "center" }}>
      <Text variant="subhead" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

/* --------------------------------------------------------- OptionCard */

/** Large selectable row for single choices (onboarding, settings). */
export function OptionCard({
  title,
  detail,
  icon,
  selected,
  onPress,
  accent,
}: {
  title: string;
  detail?: string;
  icon?: ReactNode;
  selected: boolean;
  onPress: () => void;
  accent?: string;
}) {
  const { colors, elevation } = useTheme();
  const ring = accent ?? colors.brand.ember;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: space[5],
          padding: space[5],
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: selected ? ring : "transparent",
          transform: [{ scale: pressed ? motion.pressScale : 1 }],
        },
        elevation.card,
      ]}
    >
      {icon}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline">{title}</Text>
        {detail ? (
          <Text variant="subhead" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: selected ? 7 : 2,
          borderColor: selected ? ring : colors.fillStrong,
        }}
      />
    </Pressable>
  );
}

/** Circle with the user's initial. */
export function Avatar({ name, size = 36, onPress }: { name: string; size?: number; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Profile"
      disabled={!onPress}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brand.ember,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pressed ? motion.pressScale : 1 }],
      })}
    >
      <RNText style={{ fontFamily: fonts.displayHeavy, fontSize: size * 0.44, color: "#FFFFFF" }}>
        {(name.trim()[0] ?? "F").toUpperCase()}
      </RNText>
    </Pressable>
  );
}

/** Round icon button for headers (close, back, more). */
export function IconButton({ children, onPress, label }: { children: ReactNode; onPress: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.fill,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

/** − value + control for small integers (sets, reps). */
export function Stepper({ value, onChange, min = 0, step = 1, unit }: { value: number; onChange: (v: number) => void; min?: number; step?: number; unit?: string }) {
  const { colors } = useTheme();
  const btn = (label: string, next: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === "−" ? "Decrease" : "Increase"}
      onPress={() => onChange(Math.max(min, next))}
      hitSlop={4}
      style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 })}
    >
      <RNText style={{ fontFamily: fonts.semibold, fontSize: 18, lineHeight: 20, color: colors.text }}>{label}</RNText>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
      {btn("−", value - step)}
      <Text variant="headline" style={{ minWidth: 44, textAlign: "center", fontVariant: ["tabular-nums"] }}>
        {value}
        {unit ? <Text variant="footnote" tone="secondary">{` ${unit}`}</Text> : null}
      </Text>
      {btn("+", value + step)}
    </View>
  );
}
