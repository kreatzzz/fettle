import { router } from 'expo-router';
import { Text as RNText, View } from 'react-native';

import { FatigueLegend, fonts, radius, space, type, useTheme } from '@/design';
import { MUSCLES, type MuscleId } from '@/domain/muscles';
import { useFatigue } from '@/lib/derive';
import { MuscleMap } from './MuscleMap';

/** Night-stage card with the full figure. Tapping a muscle opens its detail. */
export function BodyCard({ height = 330, title = 'Muscle map' }: { height?: number; title?: string }) {
  const { colors } = useTheme();
  const { load, levels } = useFatigue();
  const worked = (Object.keys(load) as MuscleId[]).filter((m) => load[m].level > 0).sort((a, b) => load[b].ratio - load[a].ratio);
  const summary = worked.length
    ? `${worked.slice(0, 2).map((m) => MUSCLES[m].label).join(' and ')} ${worked.length > 2 ? `+${worked.length - 2} more ` : ''}still recovering`
    : 'Everything is fresh';

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
