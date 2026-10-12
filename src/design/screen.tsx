import { Children, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { IconButton, Text } from "./components";
import { useTheme } from "./theme";
import { layout, space } from "./tokens";

/** Tab bar height (64) + its bottom margin; screens leave this much room below content. */
export const TAB_BAR_CLEARANCE = 64 + 12 + 24;

export function Screen({
  title,
  subtitle,
  right,
  children,
  tabs = true,
}: {
  title: string;
  subtitle?: string;
  /** Header accessory beside the title, e.g. the profile avatar. */
  right?: ReactNode;
  children: ReactNode;
  /** Leave room for the floating tab bar. */
  tabs?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + space[5],
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + (tabs ? TAB_BAR_CLEARANCE : space[8]),
          gap: layout.gridGap,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end", paddingBottom: space[3], gap: space[4] }}>
          <View style={{ flex: 1 }}>
            {subtitle ? (
              <Text variant="footnote" tone="secondary">
                {subtitle}
              </Text>
            ) : null}
            <Text variant="largeTitle">{title}</Text>
          </View>
          {right}
        </View>
        {/* Cards ease in one after another the first time a screen opens. */}
        {Children.toArray(children).map((child, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(Math.min(i, 6) * 45).duration(300)}>
            {child}
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

/** Small section label between cards. */
export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: space[4], paddingHorizontal: space[2] }}>
      <Text variant="title3" style={{ flex: 1 }}>
        {children}
      </Text>
      {right}
    </View>
  );
}

/** Full-height sheet with a title row and close button; optional pinned footer. */
export function SheetScreen({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: Math.max(insets.top, space[5]), paddingHorizontal: layout.gutter, paddingBottom: space[4] }}>
        <Text variant="title2" style={{ flex: 1 }}>
          {title}
        </Text>
        <IconButton label="Close" onPress={onClose}>
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <Path d="M2 2l10 10M12 2L2 12" stroke={colors.text} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </IconButton>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: layout.gutter, paddingTop: space[3], gap: layout.gridGap, paddingBottom: space[8] }}>
        {children}
      </ScrollView>
      {footer ? <View style={{ padding: layout.gutter, paddingBottom: insets.bottom + space[4] }}>{footer}</View> : null}
    </View>
  );
}
