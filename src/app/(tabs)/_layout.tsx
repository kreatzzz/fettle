import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, type TabItem } from '@/design';
import { VoiceOverlay, useVoiceUI } from '@/features/voice/VoiceOverlay';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName) {
  return function TabIcon(color: string, size: number) {
    return <Ionicons name={name} size={size} color={color} />;
  };
}

// Four tabs around the centered voice button, which opens the voice coach over any tab.
const tabs: TabItem[] = [
  { key: 'index', label: 'Today', icon: icon('sunny-outline') },
  { key: 'workouts', label: 'Train', icon: icon('barbell-outline') },
  { key: 'meals', label: 'Eat', icon: icon('restaurant-outline') },
  { key: 'equipment', label: 'Gear', icon: icon('cube-outline') },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const showVoice = useVoiceUI((s) => s.show);
  return (
    <>
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <TabBar
            tabs={tabs}
            active={state.routes[state.index]?.name ?? 'index'}
            onSelect={(key) => navigation.navigate(key)}
            onVoice={showVoice}
            bottomInset={insets.bottom}
          />
        </View>
      )}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.key} name={tab.key} options={{ title: tab.label }} />
      ))}
    </Tabs>
    <VoiceOverlay />
    </>
  );
}
