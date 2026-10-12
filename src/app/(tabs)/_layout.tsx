import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, type TabItem } from '@/design';

type IconName = keyof typeof Ionicons.glyphMap;

// Outline when idle, filled when selected.
function icon(outline: IconName, filled: IconName) {
  return function TabIcon(color: string, size: number, selected: boolean) {
    return <Ionicons name={selected ? filled : outline} size={size} color={color} />;
  };
}

// Four tabs around the centered voice button, which opens the voice coach over any tab.
const tabs: TabItem[] = [
  { key: 'index', label: 'Today', icon: icon('sunny-outline', 'sunny') },
  { key: 'workouts', label: 'Train', icon: icon('barbell-outline', 'barbell') },
  { key: 'meals', label: 'Eat', icon: icon('restaurant-outline', 'restaurant') },
  { key: 'equipment', label: 'Gear', icon: icon('cube-outline', 'cube') },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <>
    <Tabs
      screenOptions={{ headerShown: false, animation: 'fade' }}
      tabBar={({ state, navigation }) => (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <TabBar
            tabs={tabs}
            active={state.routes[state.index]?.name ?? 'index'}
            onSelect={(key) => navigation.navigate(key)}
            onVoice={() => router.push('/coach')}
            bottomInset={insets.bottom}
          />
        </View>
      )}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.key} name={tab.key} options={{ title: tab.label }} />
      ))}
    </Tabs>
    </>
  );
}
