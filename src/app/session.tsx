import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button, Card, SheetScreen, Text, fonts, radius, space, useTheme } from '@/design';
import { EXERCISE_BY_ID } from '@/domain/exercises';
import type { SetEntry } from '@/domain/types';
import { goBack } from '@/lib/nav';
import { LIMITS, clamp, numericText, type Limit } from '@/lib/validate';
import { useActiveSession, useApp } from '@/store/app-store';

export default function SessionScreen() {
  const session = useActiveSession();
  const finish = useApp((s) => s.finishSession);
  const discard = useApp((s) => s.discardSession);
  const addSet = useApp((s) => s.addSet);
  const elapsed = useElapsed(session?.startedAt);

  if (!session) {
    return (
      <SheetScreen title="Workout" onClose={() => goBack('/workouts')}>
        <Text variant="body" tone="secondary">
          No workout in progress.
        </Text>
      </SheetScreen>
    );
  }

  const done = session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const total = session.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <SheetScreen
      title={session.name}
      onClose={() => goBack('/workouts')}
      footer={
        <View style={{ gap: space[3] }}>
          <Button
            variant="brand"
            label={done ? `Finish · ${done} sets` : 'Finish'}
            onPress={() => {
              finish(session.id);
              goBack('/workouts');
            }}
          />
          <Button
            variant="tertiary"
            label="Discard workout"
            onPress={() => {
              discard(session.id);
              goBack('/workouts');
            }}
          />
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: space[7], paddingHorizontal: space[2], marginBottom: space[3] }}>
        <Stat label="Time" value={elapsed} />
        <Stat label="Sets" value={`${done}/${total}`} />
      </View>
      {session.exercises.map((e, exIndex) => {
        const ex = EXERCISE_BY_ID.get(e.exerciseId);
        return (
          <Card key={`${e.exerciseId}-${exIndex}`} title={ex?.name} category="training">
            <Text variant="footnote" tone="secondary" style={{ marginTop: -space[3], marginBottom: space[4] }}>
              {ex?.cue}
            </Text>
            <View style={{ flexDirection: 'row', paddingBottom: space[2] }}>
              <Text variant="caption" tone="secondary" style={{ width: 36 }}>
                Set
              </Text>
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                kg
              </Text>
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                Reps
              </Text>
              <View style={{ width: 40 }} />
            </View>
            {e.sets.map((set, setIndex) => (
              <SetRow key={setIndex} sessionId={session.id} exIndex={exIndex} setIndex={setIndex} set={set} />
            ))}
            <Pressable accessibilityRole="button" onPress={() => addSet(session.id, exIndex)} hitSlop={6} style={{ paddingTop: space[4] }}>
              <Text variant="footnote" tone="secondary">
                + Add set
              </Text>
            </Pressable>
          </Card>
        );
      })}
    </SheetScreen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      <Text variant="metric">{value}</Text>
    </View>
  );
}

function SetRow({ sessionId, exIndex, setIndex, set }: { sessionId: string; exIndex: number; setIndex: number; set: SetEntry }) {
  const { colors } = useTheme();
  const update = useApp((s) => s.updateSet);
  const commit = (key: 'weightKg' | 'reps') => (n: number) => update(sessionId, exIndex, setIndex, { [key]: n });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space[2] }}>
      <Text variant="headline" tone={set.done ? 'secondary' : 'primary'} style={{ width: 36 }}>
        {setIndex + 1}
      </Text>
      <NumberCell value={set.weightKg} placeholder="BW" label={`Set ${setIndex + 1} weight`} muted={set.done} limit={LIMITS.setKg} onCommit={commit('weightKg')} />
      <NumberCell value={set.reps} placeholder="0" label={`Set ${setIndex + 1} reps`} muted={set.done} limit={LIMITS.reps} onCommit={commit('reps')} />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done }}
        accessibilityLabel={`Complete set ${setIndex + 1}`}
        onPress={() => update(sessionId, exIndex, setIndex, { done: !set.done })}
        hitSlop={6}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: set.done ? colors.brand.ember : colors.fill,
        }}
      >
        <Ionicons name="checkmark" size={20} color={set.done ? '#FFFFFF' : colors.textTertiary} />
      </Pressable>
    </View>
  );
}

/** Numeric input that keeps its own text (so "22." survives) and commits numbers upward. */
function NumberCell({ value, placeholder, label, muted, limit, onCommit }: { value: number; placeholder: string; label: string; muted: boolean; limit: Limit; onCommit: (n: number) => void }) {
  const { colors } = useTheme();
  const [text, setText] = useState(value ? String(value) : '');
  return (
    <View style={{ flex: 1, paddingRight: space[3] }}>
      <TextInput
        value={text}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
        maxLength={5}
        accessibilityLabel={label}
        onChangeText={(t) => {
          const raw = numericText(t);
          // Cap at the limit as you type rather than accepting 5000 reps.
          const v = Number(raw) > limit.max ? String(limit.max) : raw;
          setText(v);
          onCommit(clamp(Number(v) || 0, limit));
        }}
        style={{
          height: 40,
          borderRadius: radius.xs,
          backgroundColor: muted ? 'transparent' : colors.fill,
          paddingHorizontal: space[3],
          color: colors.text,
          fontFamily: fonts.semibold,
          fontSize: 16,
        }}
      />
    </View>
  );
}

function useElapsed(startedAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!startedAt) return '0:00';
  const s = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
}
