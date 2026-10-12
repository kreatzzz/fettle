import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  Avatar,
  BarChart,
  Button,
  Card,
  Dot,
  EmptyState,
  ProgressBar,
  Screen,
  SectionLabel,
  SplitBar,
  Text,
  radius,
  space,
  useTheme,
} from '@/design';
import { useNutrition } from '@/lib/derive';
import { MEAL_KINDS } from '@/lib/meals';
import { useApp } from '@/store/app-store';


export default function EatScreen() {
  const { colors } = useTheme();
  const profile = useApp((s) => s.profile);
  const deleteMeal = useApp((s) => s.deleteMeal);
  const { todays, totals, weekKcal, weekLabels } = useNutrition();
  if (!profile) return null;

  const macroRows = [
    { key: 'protein', label: 'Protein', value: totals.protein, target: profile.proteinTarget },
    { key: 'carbs', label: 'Carbs', value: totals.carbs, target: Math.round((profile.kcalTarget * 0.45) / 4) },
    { key: 'fat', label: 'Fat', value: totals.fat, target: Math.round((profile.kcalTarget * 0.28) / 9) },
  ] as const;
  const left = profile.kcalTarget - totals.kcal;

  return (
    <Screen title="Eat" right={<Avatar name={profile.name} onPress={() => router.push('/profile')} />}>
      <Card>
        <View style={{ gap: space[5] }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Text variant="footnote" tone="secondary">
                Eaten today
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
                <Text variant="metricXL">{totals.kcal.toLocaleString()}</Text>
                <Text variant="unit" tone="secondary">
                  kcal
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="metricS">{Math.abs(left).toLocaleString()}</Text>
              <Text variant="footnote" tone="secondary">
                {left >= 0 ? 'left' : 'over'}
              </Text>
            </View>
          </View>
          <ProgressBar progress={totals.kcal / profile.kcalTarget} color={colors.category.nutrition} />
          {totals.kcal > 0 ? <SplitBar parts={macroRows.map((r) => ({ value: r.value * (r.key === 'fat' ? 9 : 4), color: colors.macro[r.key] }))} /> : null}
          {macroRows.map((r) => (
            <View key={r.key} style={{ gap: space[2] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                <Dot color={colors.macro[r.key]} />
                <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
                  {r.label}
                </Text>
                <Text variant="footnote" style={{ fontVariant: ['tabular-nums'] }}>
                  {r.value} / {r.target} g
                </Text>
              </View>
              <ProgressBar progress={r.value / r.target} color={colors.macro[r.key]} />
            </View>
          ))}
        </View>
      </Card>

      <Button
        variant="brand"
        label="Log a meal"
        onPress={() => router.push('/log-meal')}
        icon={<Ionicons name="add" size={20} color="#FFFFFF" />}
      />

      <SectionLabel>Today</SectionLabel>
      {todays.length ? (
        MEAL_KINDS.map(({ kind, label, icon }) => {
          const list = todays.filter((m) => m.kind === kind);
          if (!list.length) return null;
          return (
            <Card key={kind}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[2] }}>
                <View style={{ width: 28, height: 28, borderRadius: radius.xs, backgroundColor: colors.category.nutrition, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={icon} size={16} color="#FFFFFF" />
                </View>
                <Text variant="title3" style={{ flex: 1 }}>
                  {label}
                </Text>
                <Text variant="footnote" tone="secondary">
                  {list.reduce((n, m) => n + m.kcal, 0)} kcal
                </Text>
              </View>
              {list.map((m, i) => (
                <View
                  key={m.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: space[4],
                    borderBottomWidth: i === list.length - 1 ? 0 : 0.5,
                    borderBottomColor: colors.separator,
                    gap: space[3],
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="body">{m.name}</Text>
                    <Text variant="footnote" tone="secondary">
                      P {m.protein} · C {m.carbs} · F {m.fat}
                    </Text>
                  </View>
                  <Text variant="body" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
                    {m.kcal}
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${m.name}`} onPress={() => deleteMeal(m.id)} hitSlop={10}>
                    <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                  </Pressable>
                </View>
              ))}
            </Card>
          );
        })
      ) : (
        <Card>
          <EmptyState label="Nothing logged yet today" />
        </Card>
      )}

      <Card title="Calories" category="nutrition" accessory={<Text variant="footnote" tone="secondary">7 days</Text>}>
        <BarChart values={weekKcal} labels={weekLabels} color={colors.category.nutrition} highlightIndex={6} goal={profile.kcalTarget} />
      </Card>
    </Screen>
  );
}
