import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar, Button, Card, RingStack, Screen, Text, WeekChart, space, useTheme, type RingDatum } from '@/design';
import { EXERCISE_BY_ID } from '@/domain/exercises';
import { MUSCLES, type MuscleId } from '@/domain/muscles';
import { greeting, useDraft, useNutrition, useTraining, useWeekTiles } from '@/lib/derive';
import { useActivePlace, useActiveSession, useApp } from '@/store/app-store';

const DEFAULT_WEEKLY = 4;

export default function TodayScreen() {
  const { colors } = useTheme();
  const profile = useApp((s) => s.profile);
  const startSession = useApp((s) => s.startSession);
  const { totals } = useNutrition();
  const { thisWeek, streak } = useTraining();
  const week = useWeekTiles();
  const draft = useDraft();
  const place = useActivePlace();
  const active = useActiveSession();
  if (!profile) return null;
  const weekly = profile.weeklyWorkouts ?? DEFAULT_WEEKLY;

  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const rings: RingDatum[] = [
    { key: 'training', label: 'Workouts', progress: thisWeek / weekly },
    { key: 'nutrition', label: 'Calories', progress: totals.kcal / profile.kcalTarget },
    { key: 'body', label: 'Protein', progress: totals.protein / profile.proteinTarget },
  ];
  const ringValues = [`${thisWeek}/${weekly}`, `${totals.kcal.toLocaleString()}`, `${totals.protein} g`];
  const ringColors = [colors.category.training, colors.category.nutrition, colors.category.body];
  const targets = draft ? [...new Set(draft.items.flatMap((it) => EXERCISE_BY_ID.get(it.exerciseId)?.primary ?? []))].slice(0, 4) : [];

  const start = () => {
    if (!active && draft) startSession(draft.name, draft.items);
    router.push('/session');
  };

  return (
    <Screen
      title={`${greeting()}, ${profile.name}`}
      subtitle={date}
      right={<Avatar name={profile.name} size={32} onPress={() => router.push('/profile')} />}
    >
      {/* The day's rings, unboxed. Labels take their ring's colour instead of a dot; the workouts ring is the one orange accent. */}
      <View style={{ alignItems: 'center', gap: space[5], paddingVertical: space[2] }}>
        <RingStack rings={rings} size={184} stroke={15} />
        <View style={{ flexDirection: 'row', alignSelf: 'stretch' }}>
          {rings.map((ring, i) => (
            <View key={ring.key} style={{ flex: 1, alignItems: 'center' }}>
              <Text variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                {ringValues[i]}
              </Text>
              <Text variant="caption" style={{ color: ringColors[i] }}>
                {ring.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Card title={active ? 'In progress' : 'Up next'} accessory={<Text variant="footnote" tone="tertiary">{place?.name}</Text>}>
        {draft && draft.items.length ? (
          <View style={{ gap: space[4] }}>
            <View style={{ gap: 2 }}>
              <Text variant="title3">{active ? active.name : draft.name}</Text>
              <Text variant="footnote" tone="secondary">
                {active
                  ? `${active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)} sets done`
                  : `${draft.items.length} exercises · ~${draft.items.length * 8} min`}
              </Text>
            </View>
            {!active ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                {targets.map((m) => (
                  <TargetTag key={m} muscle={m} />
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              <Button
                size="sm"
                variant="brand"
                label={active ? 'Resume' : 'Start workout'}
                onPress={start}
                style={{ flex: 1 }}
                icon={<Ionicons name="play" size={14} color="#FFFFFF" />}
              />
              <Button size="sm" variant="secondary" label="Plan" onPress={() => router.navigate('/workouts')} />
            </View>
          </View>
        ) : (
          <Text variant="subhead" tone="secondary">
            Add equipment in Gear, or everything needs rest today.
          </Text>
        )}
      </Card>

      <Card title="This week" accessory={<Text variant="footnote" tone="tertiary">{streak ? `${streak}-day streak` : ''}</Text>}>
        <WeekChart days={week} goal={weekly} />
      </Card>

      <Card
        title="Meals"
        accessory={
          <Pressable accessibilityRole="link" accessibilityLabel="Open meals" onPress={() => router.navigate('/meals')} hitSlop={10}>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
            <Text variant="title2" style={{ fontVariant: ['tabular-nums'] }}>
              {Math.max(0, profile.kcalTarget - totals.kcal).toLocaleString()}
            </Text>
            <Text variant="footnote" tone="secondary">
              kcal left
            </Text>
          </View>
          <Button size="sm" variant="secondary" label="Log meal" onPress={() => router.push('/log-meal')} icon={<Ionicons name="add" size={14} color={colors.text} />} />
        </View>
      </Card>
    </Screen>
  );
}

/** Which muscles today's session hits: quiet neutral tags. */
function TargetTag({ muscle }: { muscle: MuscleId }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: space[3], paddingVertical: 4, borderRadius: 999, backgroundColor: colors.fill }}>
      <Text variant="caption" tone="secondary">
        {MUSCLES[muscle].label}
      </Text>
    </View>
  );
}
