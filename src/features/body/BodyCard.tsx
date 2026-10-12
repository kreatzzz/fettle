import { router } from 'expo-router';
import { Text as RNText, View } from 'react-native';

import { FatigueLegend, fonts, radius, space, type, useTheme } from '@/design';
import { useFatigue } from '@/lib/derive';
import { MuscleMap } from './MuscleMap';

/** Night-stage card with the full figure. Tapping a muscle opens its detail. */
export function BodyCard({ height = 330, title = 'Muscle map' }: { height?: number; title?: string }) {
  const { colors } = useTheme();
  const { load, levels } = useFatigue();
  const statuses = Object.values(load).map((s) => s.level);
  const needRest = statuses.filter((l) => l === 3).length;
  const recovering = statuses.filter((l) => l === 2).length;
  const ready = statuses.length - needRest - recovering;
  const summary = `${needRest} need rest · ${recovering} recovering · ${ready} ready`;

  return (
    <View style={{ backgroundColor: colors.stage.background, borderRadius: radius.lg, padding: space[5], gap: space[5], overflow: 'hidden' }}>
      <View style={{ gap: 2 }}>
        <RNText style={[type.title3, { color: colors.stage.text }]}>{title}</RNText>
        <RNText style={[type.subhead, { color: colors.stage.textSecondary }]}>{summary}</RNText>
      </View>
      <MuscleMap levels={levels} height={height} onSelect={(m) => router.push({ pathname: '/muscle/[id]', params: { id: m } })} />
      <FatigueLegend />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <RNText style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.stage.textSecondary }}>Front</RNText>
        <RNText style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.stage.textSecondary }}>Tap a muscle · estimated from your sets</RNText>
        <RNText style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.stage.textSecondary }}>Back</RNText>
      </View>
    </View>
  );
}
