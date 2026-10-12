/**
 * Design system preview. Renders every token and core component in one scroll,
 * with a light/dark switch. Mount it at a dev-only route (e.g. app/design.tsx).
 * Values shown are placeholders for the preview only, not user data.
 */
import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import {
  BarChart,
  Button,
  Card,
  FatigueLegend,
  IconBadge,
  LineChart,
  ListRow,
  RingLegend,
  RingStack,
  SegmentedControl,
  SplitBar,
  StatTile,
  TabBar,
  Text,
  TextField,
  type RingDatum,
  type TabItem,
} from "./components";
import { ThemeProvider, useTheme } from "./theme";
import { layout, radius, space, type ColorScheme } from "./tokens";

export default function DesignPreview({ initialScheme = "light" }: { initialScheme?: ColorScheme }) {
  const [scheme, setScheme] = useState<ColorScheme>(initialScheme);
  return (
    <ThemeProvider scheme={scheme}>
      <Preview scheme={scheme} onScheme={setScheme} />
    </ThemeProvider>
  );
}

const rings: RingDatum[] = [
  { key: "training", label: "Training", progress: 0.72 },
  { key: "nutrition", label: "Nutrition", progress: 0.86 },
  { key: "body", label: "Recovery", progress: 0.54 },
];

function tabIcon(d: string) {
  return function TabIcon(color: string, size: number) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <Path d={d} />
      </Svg>
    );
  };
}

const tabs: TabItem[] = [
  { key: "today", label: "Today", icon: tabIcon("M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z") },
  { key: "train", label: "Train", icon: tabIcon("M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12") },
  { key: "eat", label: "Eat", icon: tabIcon("M7 3v8a2 2 0 0 0 2 2v8M11 3v6M3 3v6a4 4 0 0 0 4 4M17 21V3c2 0 4 2 4 6s-2 5-4 5") },
  { key: "progress", label: "Progress", icon: tabIcon("M4 20V10M10 20V4M16 20v-7M22 20H2") },
];

function Preview({ scheme, onScheme }: { scheme: ColorScheme; onScheme: (s: ColorScheme) => void }) {
  const { colors } = useTheme();
  const [weight, setWeight] = useState("72.4");
  const [range, setRange] = useState<"w" | "m" | "y">("w");
  const [tab, setTab] = useState("today");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: layout.gutter, paddingTop: 60, gap: layout.sectionGap, paddingBottom: 120 }}>
        <View style={{ gap: space[4] }}>
          <Text variant="largeTitle">Design system</Text>
          <SegmentedControl
            value={scheme}
            onChange={onScheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </View>

        <Section title="Summary">
          <Card title="Today" accessory={<Text variant="footnote" tone="secondary">Sat</Text>}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space[7] }}>
              <RingStack rings={rings} />
              <RingLegend rings={rings} values={["38/50 min", "1,840 kcal", "Moderate"]} />
            </View>
          </Card>
          <View style={{ flexDirection: "row", gap: layout.gridGap }}>
            <StatTile label="Volume" value="8,420" unit="kg" category="training" trend={[5, 7, 6, 8, 7, 9, 8.4]} delta="+6% vs last week" />
            <StatTile label="Protein" value="118" unit="g" category="nutrition" trend={[90, 110, 95, 120, 105, 130, 118]} delta="Goal 140 g" />
          </View>
        </Section>

        <Section title="Charts">
          <Card title="Training minutes" category="training" accessory={<Text variant="footnote" tone="secondary">This week</Text>}>
            <View style={{ gap: space[4] }}>
              <SegmentedControl
                value={range}
                onChange={setRange}
                options={[
                  { value: "w", label: "W" },
                  { value: "m", label: "M" },
                  { value: "y", label: "Y" },
                ]}
              />
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[2] }}>
                <Text variant="metric">46</Text>
                <Text variant="unit" tone="secondary">min avg</Text>
              </View>
              <BarChart
                width={300}
                values={[42, 0, 55, 38, 61, 30, 48]}
                labels={["M", "T", "W", "T", "F", "S", "S"]}
                color={colors.category.training}
                highlightIndex={6}
                goal={45}
              />
            </View>
          </Card>
          <Card title="Body weight" category="body" accessory={<Text variant="footnote" tone="secondary">30 days</Text>}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[2], marginBottom: space[4] }}>
              <Text variant="metric">72.4</Text>
              <Text variant="unit" tone="secondary">kg</Text>
            </View>
            <LineChart width={300} values={[74.1, 73.8, 73.9, 73.5, 73.2, 73.4, 72.9, 72.8, 72.6, 72.4]} color={colors.category.body} />
          </Card>
          <Card title="Macros" category="nutrition">
            <SplitBar
              parts={[
                { value: 118, color: colors.macro.protein },
                { value: 210, color: colors.macro.carbs },
                { value: 62, color: colors.macro.fat },
              ]}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space[4] }}>
              {(
                [
                  ["Protein", "118 g", colors.macro.protein],
                  ["Carbs", "210 g", colors.macro.carbs],
                  ["Fat", "62 g", colors.macro.fat],
                ] as const
              ).map(([label, value, color]) => (
                <View key={label} style={{ gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                    <Text variant="footnote" tone="secondary">{label}</Text>
                  </View>
                  <Text variant="headline">{value}</Text>
                </View>
              ))}
            </View>
          </Card>
          <Card title="Muscle fatigue" category="training">
            <FatigueLegend />
          </Card>
        </Section>

        <Section title="Buttons">
          <Button label="Start workout" onPress={() => {}} />
          <Button label="Log meal" variant="secondary" onPress={() => {}} />
          <View style={{ flexDirection: "row", gap: space[3] }}>
            <Button label="Swap" size="sm" variant="secondary" onPress={() => {}} />
            <Button label="Skip" size="sm" variant="tertiary" onPress={() => {}} />
            <Button label="Delete" size="sm" variant="destructive" onPress={() => {}} />
          </View>
        </Section>

        <Section title="Inputs">
          <Card>
            <View style={{ gap: space[5] }}>
              <TextField label="Body weight" value={weight} onChangeText={setWeight} unit="kg" keyboardType="decimal-pad" />
              <TextField label="Meal name" value="" onChangeText={() => {}} placeholder="e.g. Chicken rice bowl" />
            </View>
          </Card>
        </Section>

        <Section title="Lists">
          <Card style={{ paddingVertical: 0 }}>
            <ListRow
              leading={<IconBadge category="training"><Glyph /></IconBadge>}
              title="Push day"
              detail="Home gym · 6 exercises"
              value="52 min"
              onPress={() => {}}
            />
            <ListRow
              leading={<IconBadge category="nutrition"><Glyph /></IconBadge>}
              title="Lunch"
              detail="Rice bowl"
              value="640 kcal"
              onPress={() => {}}
            />
            <ListRow leading={<IconBadge category="coach"><Glyph /></IconBadge>} title="Coach" detail="Swap barbell rows" onPress={() => {}} last />
          </Card>
        </Section>

        <Section title="Color">
          <Card>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[4] }}>
              {Object.entries(colors.category).map(([k, c]) => (
                <Swatch key={k} name={k} color={c} />
              ))}
              {Object.entries(colors.status).map(([k, c]) => (
                <Swatch key={k} name={k} color={c} />
              ))}
            </View>
          </Card>
        </Section>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <TabBar tabs={tabs} active={tab} onSelect={setTab} onVoice={() => {}} bottomInset={20} />
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: layout.gridGap }}>
      <Text variant="title3">{title}</Text>
      {children}
    </View>
  );
}

function Swatch({ name, color }: { name: string; color: string }) {
  return (
    <View style={{ width: 64, gap: space[2] }}>
      <View style={{ height: 40, borderRadius: radius.sm, backgroundColor: color }} />
      <Text variant="caption" tone="secondary">{name}</Text>
    </View>
  );
}

function Glyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Circle cx={8} cy={8} r={4} fill="#FFFFFF" />
    </Svg>
  );
}
