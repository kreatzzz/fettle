/**
 * Layout for one-question-per-screen flows (sign up, onboarding): back on the
 * left, a 3D wheel of step icons, a small centred title and subtitle, one big centred answer, and a pill Continue that stays grey until the
 * answer is valid. Each step slides in from the side it's coming from.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text as RNText, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, IconCarousel, Text, fonts, layout, motion, radius, space, type, useTheme } from '@/design';

export type IonName = keyof typeof Ionicons.glyphMap;

function stepIcon(name: IonName) {
  return function StepIcon(color: string) {
    return <Ionicons name={name} size={26} color={color} />;
  };
}

export function QuestionFrame({
  stepKey,
  step,
  icons,
  direction,
  onBack,
  right,
  title,
  detail,
  children,
  cta,
  center = false,
}: {
  /** Changes whenever the question changes, to replay the entrance. */
  stepKey: string | number;
  /** Zero-based. */
  step: number;
  /** One icon per step; they ride the 3D wheel at the top. */
  icons: IonName[];
  /** 1 going forward, -1 going back. */
  direction: 1 | -1;
  onBack?: () => void;
  /** Top-right link, e.g. Skip or Sign in. */
  right?: { label: string; onPress: () => void };
  title: string;
  detail?: string;
  children: ReactNode;
  cta: { label: string; onPress: () => void; disabled?: boolean };
  /** Centre the answer in the empty middle of the screen (single inputs). */
  center?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const entering = (direction > 0 ? FadeInRight : FadeInLeft).duration(320);
  const body = (
    <Animated.View key={stepKey} entering={entering} exiting={FadeOut.duration(120)} style={center ? { flex: 1, justifyContent: 'center' } : undefined}>
      {children}
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + space[3], paddingHorizontal: layout.gutter, gap: space[5] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 }}>
          {onBack ? (
            <IconButton label="Back" onPress={onBack}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </IconButton>
          ) : (
            <View style={{ width: 36 }} />
          )}
          {right ? (
            <Pressable accessibilityRole="button" onPress={right.onPress} hitSlop={8}>
              <Text variant="subhead" style={{ fontFamily: fonts.semibold }}>
                {right.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <IconCarousel step={step} icons={icons.map(stepIcon)} />
        <Animated.View key={`h-${stepKey}`} entering={entering} style={{ alignItems: 'center', gap: space[2], paddingHorizontal: space[5] }}>
          <Text variant="title2" style={{ textAlign: 'center' }}>
            {title}
          </Text>
          {detail ? (
            <Text variant="subhead" tone="secondary" style={{ textAlign: 'center' }}>
              {detail}
            </Text>
          ) : null}
        </Animated.View>
      </View>

      {center ? (
        <View style={{ flex: 1, paddingHorizontal: layout.gutter }}>{body}</View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: layout.gutter, paddingTop: space[7], paddingBottom: space[8] }}>
          {body}
        </ScrollView>
      )}

      <View style={{ padding: layout.gutter, paddingBottom: insets.bottom + space[5] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !!cta.disabled }}
          disabled={cta.disabled}
          onPress={cta.onPress}
          style={({ pressed }) => ({
            height: 56,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: cta.disabled ? colors.fill : colors.brand.ember,
            transform: [{ scale: pressed ? motion.pressScale : 1 }],
          })}
        >
          <RNText style={[type.headline, { fontFamily: fonts.semibold, color: cta.disabled ? colors.textTertiary : '#FFFFFF' }]}>{cta.label}</RNText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
