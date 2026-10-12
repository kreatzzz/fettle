import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ActivityBars, BareField, BigStepper, ChoiceTile, MeasureField, RulerPicker, Text, fonts, radius, space, useTheme } from '@/design';
import { EQUIPMENT, PLACE_PRESETS, presetEquipment, type EquipmentId } from '@/domain/equipment';
import type { Activity, Experience, Goal } from '@/domain/types';
import { GEAR_ICONS } from '@/features/flow/gear-icons';
import { QuestionFrame, type IonName } from '@/features/flow/QuestionFrame';
import { LIMITS, NAME_MAX, checkRange, numericText } from '@/lib/validate';
import { useApp } from '@/store/app-store';

const GOALS: { value: Goal; title: string; detail: string; icon: IonName }[] = [
  { value: 'strength', title: 'Get stronger', detail: 'Heavier lifts, fewer reps', icon: 'barbell' },
  { value: 'muscle', title: 'Build muscle', detail: 'Moderate weight, more volume', icon: 'body' },
  { value: 'general', title: 'Feel fit', detail: 'Balanced, quicker sessions', icon: 'pulse' },
];
const EXPERIENCE: { value: Experience; title: string; detail: string; icon: IonName }[] = [
  { value: 'new', title: 'I’m new to lifting', detail: 'Fewer sets while you learn the moves', icon: 'leaf-outline' },
  { value: 'regular', title: 'I train regularly', detail: 'Full volume from day one', icon: 'flame-outline' },
];
const ACTIVITY: { value: Activity; label: string; factor: number }[] = [
  { value: 'sedentary', label: 'Mostly sitting', factor: 1.3 },
  { value: 'light', label: 'Lightly active', factor: 1.45 },
  { value: 'moderate', label: 'Moderately active', factor: 1.6 },
  { value: 'very', label: 'Very active', factor: 1.8 },
];
const SETUPS: { key: string; label: string; detail: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: 'none', label: 'None', detail: 'Bodyweight only', icon: 'human-handsup' },
  { key: 'minimal', label: 'Minimal', detail: 'Dumbbells, bands', icon: 'dumbbell' },
  { key: 'home', label: 'Home gym', detail: 'Bench, bar, more', icon: 'home-outline' },
  { key: 'gym', label: 'Gym', detail: 'Everything', icon: 'weight-lifter' },
];
const ALL_GEAR = Object.keys(EQUIPMENT) as EquipmentId[];


type Step = 'name' | 'goal' | 'experience' | 'activity' | 'measure' | 'training' | 'gear' | 'length' | 'targets' | 'programme';
const STEPS: { key: Step; icon: IonName }[] = [
  { key: 'name', icon: 'person' },
  { key: 'goal', icon: 'flag' },
  { key: 'experience', icon: 'ribbon' },
  { key: 'activity', icon: 'walk' },
  { key: 'measure', icon: 'resize' },
  { key: 'training', icon: 'barbell' },
  { key: 'gear', icon: 'cube' },
  { key: 'length', icon: 'timer' },
  { key: 'targets', icon: 'nutrition' },
  { key: 'programme', icon: 'sparkles' },
];

const round = (v: number, to: number) => Math.round(v / to) * to;

const TRAINING_DAYS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};
const SESSIONS = {
  full: [{ short: 'Full', name: 'Full body', muscles: 'Legs, push, pull and core' }],
  upperLower: [
    { short: 'Upper', name: 'Upper body', muscles: 'Chest, back, shoulders, arms' },
    { short: 'Lower', name: 'Lower body', muscles: 'Quads, glutes, hamstrings, calves' },
  ],
  ppl: [
    { short: 'Push', name: 'Push', muscles: 'Chest, shoulders, triceps' },
    { short: 'Pull', name: 'Pull', muscles: 'Back, biceps, rear delts' },
    { short: 'Legs', name: 'Legs', muscles: 'Quads, glutes, hamstrings, calves' },
  ],
};

function programme(experience: Experience, goal: Goal, weekly: number) {
  const kind = weekly <= 3 ? 'full' : weekly === 4 ? 'upperLower' : 'ppl';
  const split = { full: 'Full Body', upperLower: 'Upper / Lower', ppl: 'Push · Pull · Legs' }[kind];
  const level = experience === 'new' ? 'Beginner' : goal === 'strength' ? 'Strength' : 'Intermediate';
  const aim = { strength: 'Low reps and long rests to build strength.', muscle: 'Moderate weight and more volume to build muscle.', general: 'Balanced, quicker sessions to stay fit.' }[goal];
  const days = TRAINING_DAYS[weekly] ?? TRAINING_DAYS[3];
  const sessions = SESSIONS[kind];
  // Day-of-week plan: which session (if any) falls on each day, Monday first.
  const week = Array.from({ length: 7 }, (_, d) => {
    const n = days.indexOf(d);
    return n < 0 ? null : sessions[n % sessions.length];
  });
  return { name: `${level} ${split}`, aim, week, sessions };
}

export default function Onboarding() {
  const { colors } = useTheme();
  const completeOnboarding = useApp((s) => s.completeOnboarding);
  const setPlan = useApp((s) => s.setPlan);

  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [setup, setSetup] = useState<string | null>(null);
  const [weekly, setWeekly] = useState(3);
  const [gear, setGear] = useState<EquipmentId[]>([]);
  const [minutes, setMinutes] = useState(45);
  const [kcal, setKcal] = useState(2200);
  const [protein, setProtein] = useState(140);

  const step = STEPS[i];
  const go = (to: number) => {
    setDir(to > i ? 1 : -1);
    setI(to);
  };
  const next = () => go(i + 1);
  const first = name.trim();
  const weightCheck = checkRange(weight, LIMITS.weightKg);
  const heightCheck = checkRange(height, LIMITS.heightCm);
  const kg = weightCheck.value ?? 0;

  // Targets are suggested from what we know once measurements are in.
  const suggestTargets = () => {
    if (!kg) return;
    const factor = ACTIVITY.find((a) => a.value === activity)?.factor ?? 1.45;
    const surplus = goal === 'muscle' ? 250 : goal === 'strength' ? 150 : 0;
    setKcal(round(kg * 22 * factor + surplus, 50));
    setProtein(round(kg * 1.8, 5));
  };

  const finish = () => {
    const p = PLACE_PRESETS.find((x) => x.key === setup) ?? PLACE_PRESETS[2];
    completeOnboarding(
      {
        name: first || 'Athlete',
        goal: goal ?? 'muscle',
        experience: experience ?? 'regular',
        activity: activity ?? undefined,
        weightKg: kg || undefined,
        heightCm: heightCheck.value ?? undefined,
        weeklyWorkouts: weekly,
        kcalTarget: kcal,
        proteinTarget: protein,
        sessionMinutes: minutes,
        memberSince: new Date().toISOString(),
      },
      { name: p.kind === 'gym' ? 'Gym' : 'Home', kind: p.kind, equipment: gear },
    );
    setPlan({ durationMin: minutes, focus: weekly <= 3 ? 'full' : 'auto' });
    router.replace('/');
  };

  const frame = {
    stepKey: step.key,
    step: i,
    icons: STEPS.map((x) => x.icon),
    direction: dir,
    onBack: i > 0 ? () => go(i - 1) : undefined,
  } as const;

  switch (step.key) {
    case 'name':
      return (
        <QuestionFrame {...frame} center title="What should we call you?" detail="Your first name is enough." cta={{ label: 'Continue', onPress: next, disabled: !first }}>
          <BareField center value={name} onChangeText={setName} placeholder="Full name" autoFocus autoCapitalize="words" maxLength={NAME_MAX} accessibilityLabel="First name" onSubmitEditing={() => first && next()} />
        </QuestionFrame>
      );
    case 'goal':
      return (
        <QuestionFrame {...frame} title={`What are you after, ${first}?`} detail="Shapes sets, reps and rest." cta={{ label: 'Continue', onPress: next, disabled: !goal }}>
          <View style={{ gap: space[3] }}>
            {GOALS.map((g) => (
              <ChoiceTile key={g.value} title={g.title} detail={g.detail} selected={goal === g.value} onPress={() => setGoal(g.value)} icon={(c) => <Ionicons name={g.icon} size={24} color={c} />} />
            ))}
          </View>
        </QuestionFrame>
      );
    case 'experience':
      return (
        <QuestionFrame {...frame} title="How long have you lifted?" detail="New lifters start with fewer sets." cta={{ label: 'Continue', onPress: next, disabled: !experience }}>
          <View style={{ gap: space[3] }}>
            {EXPERIENCE.map((x) => (
              <ChoiceTile key={x.value} title={x.title} detail={x.detail} selected={experience === x.value} onPress={() => setExperience(x.value)} icon={(c) => <Ionicons name={x.icon} size={24} color={c} />} />
            ))}
          </View>
        </QuestionFrame>
      );
    case 'activity':
      return (
        <QuestionFrame {...frame} center title="How active are you day to day?" detail="Outside of workouts. Helps set your calories." cta={{ label: 'Continue', onPress: next, disabled: !activity }}>
          <ActivityBars options={ACTIVITY} value={activity} onChange={setActivity} />
        </QuestionFrame>
      );
    case 'measure':
      return (
        <QuestionFrame
          {...frame}
          center
          title="Your measurements"
          detail="Optional. Only used to suggest targets."
          right={{ label: 'Skip', onPress: next }}
          cta={{
            label: 'Continue',
            onPress: () => {
              suggestTargets();
              next();
            },
            // Weight is needed to suggest anything; height is optional but must be sane.
            disabled: !weightCheck.value || !!heightCheck.error,
          }}
        >
          <View style={{ gap: space[9] }}>
            <MeasureField value={weight} onChangeText={(v) => setWeight(numericText(v))} unit="kg" label="Weight" error={weightCheck.error} />
            <MeasureField value={height} onChangeText={(v) => setHeight(numericText(v, false))} unit="cm" placeholder="000" maxLength={3} label="Height" error={heightCheck.error} />
          </View>
        </QuestionFrame>
      );
    case 'training':
      return (
        <QuestionFrame {...frame} title="Workout details" detail="What you train with, and how often." cta={{ label: 'Continue', onPress: next, disabled: !setup }}>
          <View style={{ gap: space[8] }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space[3] }}>
              {SETUPS.map((x) => (
                <SetupTile
                  key={x.key}
                  label={x.label}
                  detail={x.detail}
                  icon={x.icon}
                  on={setup === x.key}
                  onPress={() => {
                    setSetup(x.key);
                    setGear(presetEquipment(x.key));
                  }}
                />
              ))}
            </View>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space[5] }}>
              <BigStepper label="Workouts per week" value={weekly} onChange={setWeekly} step={1} min={1} max={7} unit={weekly === 1 ? 'day' : 'days'} />
            </View>
          </View>
        </QuestionFrame>
      );
    case 'gear':
      return (
        <QuestionFrame {...frame} title="What’s there?" detail={`${gear.length} selected. Workouts only use what’s checked.`} cta={{ label: 'Continue', onPress: next }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space[3] }}>
            {ALL_GEAR.map((id) => (
              <ChoiceTile
                key={id}
                compact
               
                title={EQUIPMENT[id].label}
                selected={gear.includes(id)}
                onPress={() => setGear((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]))}
                icon={(c) => <MaterialCommunityIcons name={GEAR_ICONS[id]} size={22} color={c} />}
              />
            ))}
            {/* Keep the last row on the 3-column grid. */}
            {Array.from({ length: (3 - (ALL_GEAR.length % 3)) % 3 }, (_, n) => (
              <View key={`spacer-${n}`} style={{ width: '31%' }} />
            ))}
          </View>
        </QuestionFrame>
      );
    case 'length':
      return (
        <QuestionFrame {...frame} center title="How long is a session?" detail="Each workout is fitted to this." cta={{ label: 'Continue', onPress: next }}>
          <RulerPicker value={minutes} onChange={setMinutes} min={15} max={120} step={5} majorEvery={3} unit="min" />
        </QuestionFrame>
      );
    case 'targets':
      return (
        <QuestionFrame {...frame} center title="Your daily targets" detail={kg ? 'Suggested from your measurements and activity.' : 'Starting points. Change them any time.'} cta={{ label: 'Continue', onPress: next }}>
          <View style={{ gap: space[9] }}>
            <BigStepper label="Calories" value={kcal} onChange={setKcal} step={50} min={1200} max={5000} unit="kcal" />
            <BigStepper label="Protein" value={protein} onChange={setProtein} step={5} min={40} max={300} unit="g" />
          </View>
        </QuestionFrame>
      );
    case 'programme': {
      const prog = programme(experience ?? 'regular', goal ?? 'muscle', weekly);
      return (
        <QuestionFrame {...frame} title="Your programme" detail={`Built for you, ${first}.`} cta={{ label: 'Start training', onPress: finish }}>
          <View style={{ gap: space[4] }}>
            <Animated.View entering={FadeInDown.duration(450)} style={{ backgroundColor: colors.stage.background, borderRadius: radius.lg, padding: space[6], gap: space[6] }}>
              <View style={{ gap: space[2] }}>
                <Text variant="title1" style={{ color: colors.stage.text }}>
                  {prog.name}
                </Text>
                <Text variant="callout" style={{ color: colors.stage.textSecondary }}>
                  {prog.aim}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: space[3] }}>
                <ProgStat value={`${weekly}×`} label="per week" />
                <ProgStat value={`${minutes}`} label="min each" />
                <ProgStat value={`${gear.length}`} label={gear.length === 1 ? 'piece of gear' : 'pieces of gear'} />
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {prog.week.map((session, d) => (
                  <View key={d} style={{ flex: 1, alignItems: 'center', gap: space[2] }}>
                    <View
                      style={{
                        width: '100%',
                        height: 54,
                        borderRadius: radius.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: session ? colors.brand.ember : '#FFFFFF10',
                      }}
                    >
                      <Text variant="caption" style={{ color: session ? '#FFFFFF' : colors.stage.textSecondary, fontFamily: fonts.semibold }} numberOfLines={1}>
                        {session ? session.short : 'Rest'}
                      </Text>
                    </View>
                    <Text variant="caption" style={{ color: colors.stage.textSecondary }}>
                      {'MTWTFSS'[d]}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(150).duration(450)} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space[5] }}>
              {prog.sessions.map((x, n) => (
                <View key={x.name} style={{ flexDirection: 'row', alignItems: 'center', gap: space[4], paddingVertical: space[4], borderBottomWidth: n === prog.sessions.length - 1 ? 0 : 0.5, borderBottomColor: colors.separator }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand.emberSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text variant="headline" style={{ color: colors.brand.emberDeep }}>
                      {n + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="headline">{x.name}</Text>
                    <Text variant="footnote" tone="secondary">
                      {x.muscles}
                    </Text>
                  </View>
                </View>
              ))}
            </Animated.View>
            <Text variant="footnote" tone="secondary" style={{ textAlign: 'center', paddingHorizontal: space[5] }}>
              Each session is picked from what{'’'}s recovered and the gear you have, so no two weeks are the same.
            </Text>
          </View>
        </QuestionFrame>
      );
    }
  }
}

function ProgStat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF0D', borderRadius: radius.md, padding: space[4], gap: 2 }}>
      <Text variant="metricS" style={{ color: colors.stage.text }}>
        {value}
      </Text>
      <Text variant="caption" style={{ color: colors.stage.textSecondary }}>
        {label}
      </Text>
    </View>
  );
}

function SetupTile({ label, detail, icon, on, onPress }: { label: string; detail: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; on: boolean; onPress: () => void }) {
  const { colors, elevation } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: '48%',
          padding: space[5],
          gap: space[4],
          borderRadius: radius.lg,
          borderWidth: 2,
          borderColor: on ? colors.brand.ember : 'transparent',
          backgroundColor: colors.surface,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        elevation.card,
      ]}
    >
      <View style={{ width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.brand.ember : colors.fill }}>
        <MaterialCommunityIcons name={icon} size={24} color={on ? '#FFFFFF' : colors.text} />
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="headline">{label}</Text>
        <Text variant="footnote" tone="secondary">
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}
