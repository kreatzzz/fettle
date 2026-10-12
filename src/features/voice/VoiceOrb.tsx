/**
 * The coach's voice orb: three soft colour blobs (iris, ember, blue) drifting
 * inside a dark sphere. `energy` (0..1) makes them swell and spin faster, so it
 * breathes at rest and churns while you talk.
 */
import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const BLOBS = [
  { color: '#7357FF', radius: 0.14, speed: 1, phase: 0, size: 1.15 },
  { color: '#FF5A36', radius: 0.2, speed: -1.4, phase: 2.1, size: 0.95 },
  { color: '#4B91FF', radius: 0.16, speed: 1.8, phase: 4.2, size: 0.9 },
  { color: '#F7B955', radius: 0.24, speed: -0.7, phase: 1.1, size: 0.55 },
] as const;

export function VoiceOrb({ size = 220, energy }: { size?: number; energy: number }) {
  const clock = useSharedValue(0);
  const power = useSharedValue(0.15);

  useEffect(() => {
    clock.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1, false);
  }, [clock]);
  useEffect(() => {
    power.value = withSpring(energy, { damping: 12, stiffness: 90 });
  }, [energy, power]);

  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe]);

  const sphere = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + breathe.value * 0.03 + power.value * 0.1 }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: 0.25 + power.value * 0.55,
    transform: [{ scale: 1 + breathe.value * 0.05 + power.value * 0.25 }],
  }));

  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: size * 1.5, height: size * 1.5 }, halo]}>
        <Glow size={size * 1.5} color="#7357FF" />
      </Animated.View>
      <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#1A1238' }, sphere]}>
        {BLOBS.map((b, i) => (
          <Blob key={i} size={size} blob={b} clock={clock} power={power} />
        ))}
      </Animated.View>
    </View>
  );
}

function Blob({ size, blob, clock, power }: { size: number; blob: (typeof BLOBS)[number]; clock: SharedValue<number>; power: SharedValue<number> }) {
  const d = size * blob.size;
  const style = useAnimatedStyle(() => {
    const spin = 1 + power.value * 1.5;
    const a = clock.value * Math.PI * 2 * blob.speed * spin + blob.phase;
    const r = size * blob.radius * (0.7 + power.value * 0.5);
    return {
      transform: [
        { translateX: Math.cos(a) * r },
        { translateY: Math.sin(a * 1.3) * r },
        { scale: 0.85 + power.value * 0.45 },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: (size - d) / 2, top: (size - d) / 2, width: d, height: d }, style]}>
      <Glow size={d} color={blob.color} />
    </Animated.View>
  );
}

/** A soft radial glow: solid colour in the centre fading to clear. */
function Glow({ size, color }: { size: number; color: string }) {
  // Gradient ids must be unique on web, where every SVG shares one document.
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.95} />
          <Stop offset="0.55" stopColor={color} stopOpacity={0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}
