import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text as RNText, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, Card, EmptyState, ListRow, StatTile, Text, fonts, layout, radius, space, type, useTheme } from '@/design';
import { exerciseName } from '@/domain/exercises';
import { LEVEL_LABELS, dailySets, muscleHistory } from '@/domain/fatigue';
import { exercisesFor } from '@/domain/generator';
import { MUSCLES, isMuscleId } from '@/domain/muscles';
import { MuscleMap } from '@/features/body/MuscleMap';
import { useNow } from '@/lib/clock';
import { relativeDay, useFatigue, useLoggedSets } from '@/lib/derive';
import { goBack } from '@/lib/nav';
import { useActivePlace, useApp } from '@/store/app-store';

export default function MuscleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { load, levels } = useFatigue();
  const sets = useLoggedSets();
  const sessions = useApp((s) => s.sessions);
  const place = useActivePlace();
  const muscle = isMuscleId(id) ? id : null;
  const now = useNow();

  const daily = useMemo(() => (muscle ? dailySets(sets, muscle, now, 14) : []), [sets, muscle, now]);
  const history = useMemo(() => (muscle ? muscleHistory(sessions, muscle) : []), [sessions, muscle]);
  if (!muscle) return null;

  const info = MUSCLES[muscle];
  const state = load[muscle];
  const levelColor = colors.fatigue[state.level];
  const side = info.views.length === 2 ? 'both' : info.views[0];
  const train = exercisesFor(muscle, place?.equipment ?? []);
  const dayLabels = daily.map((_, i) => (i % 2 === 1 ? '' : new Date(now - (13 - i) * 86_400_000).toLocaleDateString(undefined, { day: 'numeric' })));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}>
      <View style={{ backgroundColor: colors.stage.background, paddingTop: insets.top + space[3], paddingBottom: space[7], borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }}>
        <View style={{ paddingHorizontal: layout.gutter, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => goBack()}
            hitSlop={8}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF1A', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.stage.text} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: layout.gutter + space[2], marginTop: space[5], gap: space[3] }}>
          <RNText style={[type.largeTitle, { color: colors.stage.text }]}>{info.label}</RNText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: 999, backgroundColor: '#FFFFFF14' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: levelColor }} />
              <RNText style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.stage.text }}>{LEVEL_LABELS[state.level]}</RNText>
            </View>
            <RNText style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.stage.textSecondary }}>
              {state.recoveredInHours ? `Ready to train in ~${formatHours(state.recoveredInHours)}` : 'Ready to train'}
            </RNText>
          </View>
        </View>
        <View style={{ marginTop: space[6] }}>
          <MuscleMap
            levels={levels}
            selected={muscle}
            side={side}
            height={side === 'both' ? 300 : 340}
            onSelect={(m) => router.setParams({ id: m })}
          />
        </View>
      </View>

      <View style={{ padding: layout.gutter, gap: layout.gridGap }}>
        <View style={{ flexDirection: 'row', gap: space[4] }}>
          <StatTile label="Sets, 7 days" value={formatSets(state.setsLast7d)} category="training" />
          <StatTile label="Last trained" value={state.lastTrainedAt ? relativeDay(state.lastTrainedAt) : '–'} category="training" />
        </View>
        <StatTile label="Load vs. a heavy week" value={`${Math.round(Math.min(state.ratio, 9.99) * 100)}`} unit="%" category="training" delta="Estimated from your logged sets. Secondary work counts as half a set." />

        <Card title="Last 14 days" category="training" accessory={<Text variant="footnote" tone="secondary">sets</Text>}>
          <BarChart values={daily} labels={dayLabels} color={colors.category.training} height={120} />
        </Card>

        <Card title="What happened" category="training">
          {history.length ? (
            history.map((h, i) => (
              <ListRow
                key={`${h.sessionId}-${h.exerciseId}`}
                title={exerciseName(h.exerciseId)}
                detail={`${relativeDay(h.at)} · ${h.sessionName}${h.role === 'secondary' ? ' · assisted' : ''}`}
                value={`${h.sets} × ${h.reps}${h.topKg ? ` · ${h.topKg} kg` : ''}`}
                last={i === history.length - 1}
              />
            ))
          ) : (
            <EmptyState label={`No sets for ${info.label.toLowerCase()} yet`} />
          )}
        </Card>

        <Card title="Train it with" category="training" accessory={<Text variant="footnote" tone="secondary">{place?.name}</Text>}>
          {train.length ? (
            train.map((e, i) => (
              <ListRow
                key={e.id}
                title={e.name}
                detail={e.cue}
                value={e.primary.includes(muscle) ? 'Main' : 'Assists'}
                last={i === train.length - 1}
              />
            ))
          ) : (
            <EmptyState label="Nothing with your current gear" />
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const formatSets = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const formatHours = (h: number) => (h < 24 ? `${h}h` : `${Math.round(h / 24)}d`);
