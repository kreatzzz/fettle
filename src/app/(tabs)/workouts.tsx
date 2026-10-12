import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Avatar,
  BarChart,
  Button,
  Card,
  Chip,
  EmptyState,
  ListRow,
  Screen,
  SectionLabel,
  SegmentedControl,
  Text,
  radius,
  space,
  useTheme,
} from '@/design';
import { EXERCISE_BY_ID, exerciseName } from '@/domain/exercises';
import { alternatives, type DraftItem, type Focus } from '@/domain/generator';
import { BodyCard } from '@/features/body/BodyCard';
import { relativeDay, useDraft, useTraining } from '@/lib/derive';
import { useActivePlace, useActiveSession, useApp } from '@/store/app-store';

const FOCI: { value: Focus; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'upper', label: 'Upper' },
  { value: 'lower', label: 'Lower' },
  { value: 'full', label: 'Full' },
];

export default function TrainScreen() {
  const { colors } = useTheme();
  const profile = useApp((s) => s.profile);
  const plan = useApp((s) => s.plan);
  const setPlan = useApp((s) => s.setPlan);
  const regenerate = useApp((s) => s.regenerate);
  const startSession = useApp((s) => s.startSession);
  const draft = useDraft();
  const place = useActivePlace();
  const active = useActiveSession();
  const { finished, weekSets, volume } = useTraining();
  const weekLabels = lastSevenLabels();
  const [open, setOpen] = useState<number | null>(null);

  const start = () => {
    if (!active && draft) startSession(draft.name, draft.items);
    router.push('/session');
  };

  return (
    <Screen title="Train" right={profile ? <Avatar name={profile.name} onPress={() => router.push('/profile')} /> : null}>
      <BodyCard />
      <SegmentedControl value={plan.focus} onChange={(focus) => setPlan({ focus, goal: undefined })} options={FOCI} />
      <View style={{ flexDirection: 'row', gap: space[3] }}>
        {[30, 45, 60, 75].map((m) => (
          <Chip key={m} label={`${m} min`} selected={plan.durationMin === m} onPress={() => setPlan({ durationMin: m })} />
        ))}
      </View>

      <Card
        title={draft?.name ?? 'Workout'}
        category="training"
        accessory={
          <Pressable accessibilityRole="button" accessibilityLabel="Shuffle workout" onPress={regenerate} hitSlop={8}>
            <Ionicons name="shuffle" size={22} color={colors.text} />
          </Pressable>
        }
      >
        <Text variant="subhead" tone="secondary" style={{ marginTop: -space[3], marginBottom: space[4] }}>
          {draft?.items.length ?? 0} exercises at {place?.name ?? 'your place'} · picked for what{'’'}s recovered
        </Text>
        {draft && draft.items.length ? (
          draft.items.map((item, i) => (
            <PlanRow
              key={`${item.exerciseId}-${i}`}
              item={item}
              index={i}
              last={i === draft.items.length - 1}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
              exclude={draft.items.map((x) => x.exerciseId)}
              equipment={place?.equipment ?? []}
            />
          ))
        ) : (
          <EmptyState label="Nothing fits. Add gear or rest today." />
        )}
        {draft?.skipped.length ? (
          <Text variant="caption" tone="secondary" style={{ marginTop: space[3] }}>
            {draft.skipped.join(' · ')}
          </Text>
        ) : null}
        <Button
          variant="brand"
          label={active ? 'Resume workout' : 'Start workout'}
          onPress={start}
          disabled={!draft?.items.length && !active}
          style={{ marginTop: space[5] }}
          icon={<Ionicons name="play" size={16} color="#FFFFFF" />}
        />
      </Card>

      <Card title="Sets per day" category="training" accessory={<Text variant="footnote" tone="secondary">7 days</Text>}>
        <BarChart values={weekSets} labels={weekLabels} color={colors.category.training} highlightIndex={6} />
      </Card>

      <SectionLabel>History</SectionLabel>
      <Card>
        {finished.length ? (
          finished.slice(0, 10).map((s, i, arr) => (
            <ListRow
              key={s.id}
              title={s.name}
              detail={`${relativeDay(s.finishedAt!)} · ${s.exercises.length} exercises`}
              value={volume(s) ? `${Math.round(volume(s)).toLocaleString()} kg` : `${s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)} sets`}
              last={i === arr.length - 1}
            />
          ))
        ) : (
          <EmptyState label="Finish a workout to see it here" />
        )}
      </Card>
    </Screen>
  );
}

function lastSevenLabels() {
  return Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86_400_000).toLocaleDateString(undefined, { weekday: 'narrow' }));
}

function PlanRow({
  item,
  index,
  last,
  open,
  onToggle,
  exclude,
  equipment,
}: {
  item: DraftItem;
  index: number;
  last: boolean;
  open: boolean;
  onToggle: () => void;
  exclude: string[];
  equipment: readonly string[];
}) {
  const { colors } = useTheme();
  const prefs = useApp((s) => s.prefs);
  const swap = useApp((s) => s.swapPlanItem);
  const setPref = useApp((s) => s.setPref);
  const ex = EXERCISE_BY_ID.get(item.exerciseId);
  const alts = open ? alternatives(item.exerciseId, equipment, prefs, exclude) : [];

  return (
    <View style={{ borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.separator, paddingVertical: space[4], gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
        <View style={{ width: 28, height: 28, borderRadius: radius.xs, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="footnote">{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline">{ex?.name}</Text>
          <Text variant="footnote" tone="secondary">
            {item.sets} × {item.reps}
            {item.weightKg ? ` · ${item.weightKg} kg` : ''} · {item.restSeconds}s rest
          </Text>
        </View>
        <Button size="sm" variant="secondary" label={open ? 'Close' : 'Swap'} onPress={onToggle} />
      </View>
      <Text variant="caption" tone="secondary" style={{ marginLeft: 40 }}>
        {item.reason}
      </Text>
      {open ? (
        <View style={{ marginLeft: 40, gap: space[3] }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {alts.length ? (
              alts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  onPress={() => {
                    swap(index, a.id);
                    onToggle();
                  }}
                />
              ))
            ) : (
              <Text variant="footnote" tone="secondary">
                No other option with your gear.
              </Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPref(item.exerciseId, 'blocked');
              onToggle();
            }}
            hitSlop={6}
          >
            <Text variant="footnote" style={{ color: colors.status.critical }}>
              Don{'’'}t suggest {exerciseName(item.exerciseId)} again
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
