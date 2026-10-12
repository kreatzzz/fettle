/**
 * Full-screen voice coach, opened from the mic in the tab bar. Starts
 * listening right away where speech is available; otherwise (Expo Go) it opens
 * straight to typing. Requests run through runCoachCommand.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { fonts, layout, radius, space, type, useTheme } from '@/design';
import { COACH_SUGGESTIONS, askCoach } from '@/lib/coach-commands';
import { useDraft } from '@/lib/derive';
import { useVoice } from '@/lib/voice';
import { VoiceOrb } from './VoiceOrb';

export const useVoiceUI = create<{ open: boolean; show: () => void; hide: () => void }>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

export function VoiceOverlay() {
  const open = useVoiceUI((s) => s.open);
  return open ? <Overlay /> : null;
}

function Overlay() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hide = useVoiceUI((s) => s.hide);
  const draft = useDraft();
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [text, setText] = useState('');

  const [thinking, setThinking] = useState(false);

  const handle = useCallback((input: string) => {
    setHeard(input);
    setReply('');
    setThinking(true);
    askCoach(input).then((answer) => {
      setReply(answer);
      setThinking(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });
  }, []);
  const voice = useVoice(handle);
  // Without speech (Expo Go), open straight to the keyboard.
  const [typing, setTyping] = useState(() => voice.state === 'unavailable');
  const listening = voice.state === 'listening';
  const canListen = voice.state === 'idle' || listening;

  // Siri-style: start listening as soon as the overlay opens.
  useEffect(() => {
    if (voice.state === 'idle') voice.start();
    return () => voice.stop();
    // Run once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const energy = listening ? 0.55 + voice.level * 0.45 : thinking ? 0.45 : reply ? 0.3 : 0.15;
  const hint = listening
    ? 'Listening…'
    : thinking
      ? 'Thinking…'
      : voice.state === 'unavailable'
      ? 'Voice needs the Fettle app build. Type instead.'
      : voice.state === 'denied'
        ? 'Microphone is off. Allow it in Settings, or type.'
        : 'Tap the orb and talk';
  const shown = listening ? voice.partial : heard;

  const send = () => {
    if (!text.trim()) return;
    handle(text.trim());
    setText('');
  };

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      style={{ position: 'absolute', inset: 0, backgroundColor: colors.brand.night, paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[5] }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.gutter }}>
        <RNText style={[type.headline, { color: colors.stage.textSecondary, flex: 1 }]}>Coach</RNText>
        <Pressable accessibilityRole="button" accessibilityLabel="Close coach" onPress={hide} hitSlop={10} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF14', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={20} color={colors.stage.text} />
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: layout.gutter + space[2], justifyContent: 'center', gap: space[5] }}>
        {shown ? (
          <Animated.Text key={heard} entering={FadeInDown.duration(250)} style={[type.title1, { color: colors.stage.text, fontSize: 30, lineHeight: 36 }]}>
            {shown}
          </Animated.Text>
        ) : (
          <RNText style={[type.title1, { color: '#FFFFFF40', fontSize: 30, lineHeight: 36 }]}>“Make it upper body, 30 minutes”</RNText>
        )}
        {reply && !listening ? (
          <Animated.View key={reply} entering={FadeInDown.delay(120).duration(300)} style={{ gap: space[3] }}>
            <RNText style={[type.callout, { color: colors.stage.textSecondary, fontSize: 17, lineHeight: 24 }]}>{reply}</RNText>
            {draft ? (
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: '#FFFFFF12' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand.ember }} />
                <RNText style={[type.footnote, { color: colors.stage.text }]}>
                  {draft.name} · {draft.items.length} exercises
                </RNText>
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </View>

      <View style={{ alignItems: 'center', gap: space[2] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? 'Stop listening' : 'Start listening'}
          disabled={!canListen}
          onPress={() => (listening ? voice.stop() : voice.start())}
        >
          <VoiceOrb size={150} energy={energy} />
        </Pressable>
        <RNText style={[type.subhead, { color: colors.stage.textSecondary, marginTop: -space[5] }]}>{hint}</RNText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2], paddingHorizontal: layout.gutter, paddingVertical: space[5] }} style={{ flexGrow: 0 }}>
        {COACH_SUGGESTIONS.map((s) => (
          <Pressable key={s} accessibilityRole="button" onPress={() => handle(s)} style={({ pressed }) => ({ paddingHorizontal: space[4], height: 38, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: pressed ? '#FFFFFF26' : '#FFFFFF14' })}>
            <RNText style={[type.footnote, { color: colors.stage.text }]}>{s}</RNText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: layout.gutter }}>
        {typing ? (
          <Animated.View entering={FadeInDown.duration(220)} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: '#FFFFFF12', borderRadius: radius.pill, paddingLeft: space[5], paddingRight: space[2], minHeight: 52 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={send}
              autoFocus={voice.state !== 'unavailable'}
              placeholder="Tell your coach…"
              accessibilityLabel="Message the coach"
              placeholderTextColor="#FFFFFF55"
              returnKeyType="send"
              style={{ flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 16, color: colors.stage.text, paddingVertical: space[4] }}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: text.trim() ? colors.category.coach : '#FFFFFF14', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => {
              voice.stop();
              setTyping(true);
            }} hitSlop={8} style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space[2], padding: space[3] }}>
            <Ionicons name="keypad-outline" size={16} color={colors.stage.textSecondary} />
            <RNText style={[type.subhead, { color: colors.stage.textSecondary }]}>Type instead</RNText>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
