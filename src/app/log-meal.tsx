import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, SegmentedControl, SheetScreen, Text, TextField, space } from '@/design';
import type { MealKind } from '@/domain/types';
import { MEAL_KINDS, kindForNow } from '@/lib/meals';
import { goBack } from '@/lib/nav';
import { LIMITS, checkRange, numericText } from '@/lib/validate';
import { useApp } from '@/store/app-store';


export default function LogMeal() {
  const meals = useApp((s) => s.meals);
  const addMeal = useApp((s) => s.addMeal);
  const [kind, setKind] = useState<MealKind>(kindForNow);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Recent distinct meals, newest first, for one-tap re-logging.
  const recent = useMemo(() => {
    const seen = new Set<string>();
    // Copy before sorting; avoids toSorted for older Hermes builds.
    return [...meals]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .filter((m) => (seen.has(m.name) ? false : (seen.add(m.name), true)))
      .slice(0, 6);
  }, [meals]);

  const p = checkRange(protein, LIMITS.macro);
  const c = checkRange(carbs, LIMITS.macro);
  const f = checkRange(fat, LIMITS.macro);
  const k = checkRange(kcal, LIMITS.kcal);
  const g = (x: { value: number | null }) => Math.round(x.value ?? 0);
  // Calories follow the macros until the user types their own number.
  const macroKcal = g(p) * 4 + g(c) * 4 + g(f) * 9;
  const total = kcal ? g(k) : macroKcal;
  const hasError = !!(p.error || c.error || f.error || k.error);
  const valid = name.trim().length > 0 && total > 0 && total <= LIMITS.kcal.max && !hasError;

  const save = () => {
    addMeal({ name: name.trim(), kind, kcal: total, protein: g(p), carbs: g(c), fat: g(f) });
    goBack('/meals');
  };

  return (
    <SheetScreen title="Log a meal" onClose={() => goBack('/meals')} footer={<Button label="Save meal" onPress={save} disabled={!valid} />}>
      <SegmentedControl
        value={kind}
        onChange={setKind}
        options={MEAL_KINDS.map((k) => ({ value: k.kind, label: k.label.replace('Snacks', 'Snack') }))}
      />

      {recent.length ? (
        <View style={{ gap: space[3], marginTop: space[3] }}>
          <Text variant="footnote" tone="secondary">
            Recent
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {recent.map((m) => (
              <Chip
                key={m.id}
                label={`${m.name} · ${m.kcal}`}
                selected={name === m.name}
                onPress={() => {
                  setName(m.name);
                  setKcal(String(m.kcal));
                  setProtein(String(m.protein));
                  setCarbs(String(m.carbs));
                  setFat(String(m.fat));
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Card style={{ gap: space[5], marginTop: space[3] }}>
        <TextField label="What did you eat?" value={name} onChangeText={(v) => setName(v.slice(0, 60))} placeholder="Chicken rice bowl" />
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <View style={{ flex: 1 }}>
            <TextField label="Protein" value={protein} onChangeText={(v) => setProtein(numericText(v))} error={p.error ?? undefined} unit="g" keyboardType="numeric" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Carbs" value={carbs} onChangeText={(v) => setCarbs(numericText(v))} error={c.error ?? undefined} unit="g" keyboardType="numeric" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Fat" value={fat} onChangeText={(v) => setFat(numericText(v))} error={f.error ?? undefined} unit="g" keyboardType="numeric" placeholder="0" />
          </View>
        </View>
        <TextField
          label="Calories"
          value={kcal}
          onChangeText={(v) => setKcal(numericText(v, false))}
          error={k.error ?? (macroKcal > LIMITS.kcal.max && !kcal ? `Over ${LIMITS.kcal.max} kcal` : undefined)}
          unit="kcal"
          keyboardType="numeric"
          placeholder={macroKcal ? `${macroKcal} from macros` : '0'}
        />
      </Card>
    </SheetScreen>
  );
}
