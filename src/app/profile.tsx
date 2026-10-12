import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Card, SegmentedControl, SheetScreen, StatTile, Stepper, Text, TextField, Wordmark, space, useTheme } from '@/design';
import type { Experience, Goal } from '@/domain/types';
import { useTraining } from '@/lib/derive';
import { goBack } from '@/lib/nav';
import { checkForUpdate, installUpdate, installedVersion, updatesSupported, type Update } from '@/lib/updates';
import { LIMITS, NAME_MAX, checkRange, numericText } from '@/lib/validate';
import { useApp } from '@/store/app-store';

export default function ProfileScreen() {
  const profile = useApp((s) => s.profile);
  const mealCount = useApp((s) => s.meals.length);
  const update = useApp((s) => s.updateProfile);
  const setPlan = useApp((s) => s.setPlan);
  const reset = useApp((s) => s.reset);
  const { finished, streak } = useTraining();
  const [confirmReset, setConfirmReset] = useState(false);
  const [release, setRelease] = useState<Update | null>(null);
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'current' | 'installing' | 'failed'>('idle');
  const [name, setName] = useState(profile?.name ?? '');
  const [weight, setWeight] = useState(profile?.weightKg ? String(profile.weightKg) : '');
  const weightCheck = checkRange(weight, LIMITS.weightKg);
  if (!profile) return null;

  const checkUpdates = async () => {
    setUpdateState('checking');
    const found = await checkForUpdate();
    setRelease(found);
    setUpdateState(found ? 'idle' : 'current');
  };
  const install = async () => {
    if (!release) return;
    setUpdateState('installing');
    try {
      await installUpdate(release);
      setUpdateState('idle');
    } catch {
      setUpdateState('failed');
    }
  };

  const since = new Date(profile.memberSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <SheetScreen title="Profile" onClose={() => goBack()}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[5] }}>
          <Avatar name={profile.name} size={64} />
          <View style={{ flex: 1 }}>
            <Text variant="title2">{profile.name}</Text>
            <Text variant="subhead" tone="secondary">
              Sam’s sample profile
            </Text>
            <Text variant="footnote" tone="tertiary">
              Member since {since}
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: space[3] }}>
        <StatTile label="Workouts" value={String(finished.length)} category="training" />
        <StatTile label="Meals" value={String(mealCount)} category="nutrition" />
        <StatTile label="Streak" value={String(streak)} unit="d" category="body" />
      </View>

      <Card title="You" style={{ gap: space[5] }}>
        <TextField
          label="Name"
          value={name}
          onChangeText={(v) => {
            const next = v.slice(0, NAME_MAX);
            setName(next);
            if (next.trim()) update({ name: next.trim() });
          }}
        />
        <TextField
          label="Body weight"
          value={weight}
          unit="kg"
          keyboardType="decimal-pad"
          placeholder="Not set"
          error={weightCheck.error ?? undefined}
          onChangeText={(raw) => {
            const v = numericText(raw);
            setWeight(v);
            // Only save sane values; an empty field clears it.
            const check = checkRange(v, LIMITS.weightKg);
            if (!v) update({ weightKg: undefined });
            else if (check.value) update({ weightKg: check.value });
          }}
        />
        <View style={{ gap: space[3] }}>
          <Text variant="footnote" tone="secondary">
            Goal
          </Text>
          <SegmentedControl<Goal>
            value={profile.goal}
            onChange={(goal) => update({ goal })}
            options={[
              { value: 'strength', label: 'Strength' },
              { value: 'muscle', label: 'Muscle' },
              { value: 'general', label: 'Fitness' },
            ]}
          />
        </View>
        <View style={{ gap: space[3] }}>
          <Text variant="footnote" tone="secondary">
            Experience
          </Text>
          <SegmentedControl<Experience>
            value={profile.experience}
            onChange={(experience) => update({ experience })}
            options={[
              { value: 'new', label: 'New' },
              { value: 'regular', label: 'Regular' },
            ]}
          />
        </View>
      </Card>

      <Card title="Targets">
        <TargetRow label="Calories" detail="per day">
          <Stepper value={profile.kcalTarget} step={50} min={1000} onChange={(kcalTarget) => update({ kcalTarget })} />
        </TargetRow>
        <TargetRow label="Protein" detail="grams per day">
          <Stepper value={profile.proteinTarget} step={5} min={40} onChange={(proteinTarget) => update({ proteinTarget })} />
        </TargetRow>
        <TargetRow label="Session" detail="minutes" last>
          <Stepper
            value={profile.sessionMinutes}
            step={15}
            min={15}
            onChange={(sessionMinutes) => {
              update({ sessionMinutes });
              setPlan({ durationMin: sessionMinutes });
            }}
          />
        </TargetRow>
      </Card>

      <Card title="Data" style={{ gap: space[3] }}>
        <Text variant="footnote" tone="secondary">
          Stored on this phone and backed up online. There are no accounts.
        </Text>
        <Button
          variant="destructive"
          label={confirmReset ? 'Tap again to erase your data' : 'Erase my data'}
          onPress={() => (confirmReset ? reset() : setConfirmReset(true))}
        />
      </Card>

      {updatesSupported ? (
        <Card title="App updates" style={{ gap: space[3] }}>
          <Text variant="footnote" tone="secondary">
            {release
              ? `Version ${release.version} is ready. Android will ask you to confirm the install; your data is kept.`
              : updateState === 'checking'
                ? 'Checking for updates…'
                : updateState === 'current'
                  ? 'You’re on the latest version.'
                  : updateState === 'failed'
                    ? 'Couldn’t install the update. Allow installs from Fettle in Android settings and try again.'
                    : `You have version ${installedVersion}.`}
          </Text>
          {release ? (
            <Button variant="primary" label={updateState === 'installing' ? 'Downloading…' : `Update to ${release.version}`} onPress={install} disabled={updateState === 'installing'} />
          ) : (
            <Button variant="secondary" label="Check for updates" onPress={checkUpdates} disabled={updateState === 'checking'} />
          )}
        </Card>
      ) : null}

      <View style={{ alignItems: 'center', gap: space[2], paddingVertical: space[6] }}>
        <Wordmark size={22} />
        <Text variant="caption" tone="tertiary">
          Version {installedVersion}
        </Text>
      </View>
    </SheetScreen>
  );
}

function TargetRow({ label, detail, children, last }: { label: string; detail: string; children: ReactNode; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space[4], borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.separator }}>
      <View style={{ flex: 1 }}>
        <Text variant="body">{label}</Text>
        <Text variant="footnote" tone="secondary">
          {detail}
        </Text>
      </View>
      {children}
    </View>
  );
}
