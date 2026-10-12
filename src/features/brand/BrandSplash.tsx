/**
 * In-app splash that follows the native one: the tile mark drops in, the name
 * fades up, then the whole layer fades away to reveal the app.
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AnimatedMark, BRAND_NAME, BRAND_TAGLINE, fonts, useTheme } from '@/design';

const FADE_MS = 380;

export function BrandSplash({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const [leaving, setLeaving] = useState(false);
  const layer = useSharedValue(1);
  const name = useSharedValue(0);

  useEffect(() => {
    name.value = withDelay(420, withTiming(1, { duration: 420 }));
  }, [name]);

  const leave = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    if (!leaving) return;
    layer.value = withTiming(0, { duration: FADE_MS });
    const id = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(id);
  }, [leaving, layer, onDone]);

  const layerStyle = useAnimatedStyle(() => ({ opacity: layer.value, transform: [{ scale: 1 + (1 - layer.value) * 0.04 }] }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: name.value, transform: [{ translateY: (1 - name.value) * 10 }] }));

  return (
    <Animated.View
      pointerEvents={leaving ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.brand.night, alignItems: 'center', justifyContent: 'center' }, layerStyle]}
    >
      <AnimatedMark size={96} onDone={leave} />
      <Animated.View style={[{ alignItems: 'center', marginTop: 28, gap: 6 }, nameStyle]}>
        <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 48, letterSpacing: -1.6, color: colors.brand.cream }}>
          {BRAND_NAME.toLowerCase()}
        </Text>
        <View>
          <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.stage.textSecondary }}>{BRAND_TAGLINE}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
