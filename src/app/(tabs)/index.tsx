import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar, Button, Card, RingLegend, RingStack, Screen, Text, WeekTiles, space, useTheme, type RingDatum } from '@/design';
import { EXERCISE_BY_ID } from '@/domain/exercises';
import { MUSCLES, type MuscleId } from '@/domain/muscles';
import { BodyCard } from '@/features/body/BodyCard';
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
  const targets = draft ? [...new Set(draft.items.flatMap((it) => EXERCISE_BY_ID.get(it.exerciseId)?.primary ?? []))].slice(0, 4) : [];

  const start = () => {
    if (!active && draft) startSession(draft.name, draft.items);
    router.push('/session');
  };

  return (
    <Screen
      title={`${greeting()}, ${profile.name}`}
      subtitle={date}
      right={<Avatar name={profile.name} onPress={() => router.push('/profile')} />}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[7] }}>
          <RingStack rings={rings} size={136} />
          <RingLegend
            rings={rings}
            values={[`${thisWeek}/${weekly}`, `${totals.kcal.toLocaleString()} kcal`, `${totals.protein} g`]}
          />
        </View>
      </Card>

      <Card
        title={active ? 'In progress' : 'Up next'}
        category="training"
        accessory={<Text variant="footnote" tone="secondary">{place?.name}</Text>}
      >
        {draft && draft.items.length ? (
          <View style={{ gap: space[5] }}>
            <View style={{ gap: space[2] }}>
              <Text variant="title2">{active ? active.name : draft.name}</Text>
              <Text variant="subhead" tone="secondary">
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
                variant="brand"
                label={active ? 'Resume' : 'Start workout'}
                onPress={start}
                style={{ flex: 1 }}
                icon={<Ionicons name="play" size={16} color="#FFFFFF" />}
              />
              <Button variant="secondary" label="Plan" onPress={() => router.navigate('/workouts')} />
            </View>
          </View>
        ) : (
          <Text variant="subhead" tone="secondary">
            Add equipment in Gear, or everything needs rest today.
          </Text>
        )}
      </Card>

      <BodyCard />

      <Card
        title="This week"
        category="training"
        accessory={<Text variant="footnote" tone="secondary">{streak ? `${streak}-day streak` : 'No streak yet'}</Text>}
      >
        <WeekTiles days={week} />
      </Card>

      <Card
        title="Meals"
        category="nutrition"
        accessory={
          <Pressable accessibilityRole="link" accessibilityLabel="Open meals" onPress={() => router.navigate('/meals')} hitSlop={10}>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
              <Text variant="metric">{Math.max(0, profile.kcalTarget - totals.kcal).toLocaleString()}</Text>
              <Text variant="unit" tone="secondary">
                kcal left
              </Text>
            </View>
          </View>
          <Button size="sm" variant="secondary" label="Log meal" onPress={() => router.push('/log-meal')} icon={<Ionicons name="add" size={16} color={colors.text} />} />
        </View>
      </Card>
    </Screen>
  );
}

function TargetTag({ muscle }: { muscle: MuscleId }) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  return (
    <View style={{ paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: 999, backgroundColor: dark ? `${colors.brand.ember}2E` : colors.brand.emberSoft }}>
      <Text variant="caption" style={{ color: dark ? colors.category.training : colors.brand.emberDeep }}>
        {MUSCLES[muscle].label}
      </Text>
    </View>
  );
}
