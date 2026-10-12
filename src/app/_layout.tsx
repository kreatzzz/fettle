import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/design';
import { BrandSplash } from '@/features/brand/BrandSplash';
import { startSync } from '@/lib/sync';
import { checkForUpdate, installUpdate } from '@/lib/updates';
import { useApp, useHydrated } from '@/store/app-store';

// Keep the native splash up until fonts and saved data are ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const hydrated = useHydrated();
  const onboarded = useApp((s) => s.onboarded);
  const ready = fontsLoaded && hydrated;
  const [showBrand, setShowBrand] = useState(true);

  useEffect(() => {
    if (ready) {
      SplashScreen.hide();
      startSync();
      // Offer a newer release once per launch (Android only).
      checkForUpdate().then((u) => {
        if (u) Alert.alert('Update available', `Fettle ${u.version} is ready. Your data is kept.`, [{ text: 'Later', style: 'cancel' }, { text: 'Update', onPress: () => installUpdate(u).catch(() => {}) }]);
      });
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Protected guard={onboarded}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="muscle/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="session" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
              <Stack.Screen name="log-meal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack.Protected>
            <Stack.Protected guard={!onboarded}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Screen name="design" />
          </Stack>
          {showBrand ? <BrandSplash onDone={() => setShowBrand(false)} /> : null}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
