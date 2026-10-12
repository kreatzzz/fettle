/**
 * Speech-to-text for the coach. Uses expo-speech-recognition, which is a native
 * module that Expo Go doesn't include. We only require the package when its
 * native side (or the browser's Web Speech API) is present, so Expo Go keeps
 * working and simply falls back to typing.
 */
import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type Recognizer = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

let cached: Recognizer | null | undefined;

function recognizer(): Recognizer | null {
  if (cached !== undefined) return cached;
  const hasWebSpeech =
    Platform.OS === 'web' && typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const hasNative = Platform.OS !== 'web' && requireOptionalNativeModule('ExpoSpeechRecognition') != null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cached = hasWebSpeech || hasNative ? (require('expo-speech-recognition') as typeof import('expo-speech-recognition')).ExpoSpeechRecognitionModule : null;
  return cached;
}

export type VoiceState = 'idle' | 'listening' | 'unavailable' | 'denied';

/** Listen once; `onFinal` receives the final transcript. */
export function useVoice(onFinal: (text: string) => void) {
  const [state, setState] = useState<VoiceState>(() => (recognizer() ? 'idle' : 'unavailable'));
  const [partial, setPartial] = useState('');
  // Input loudness, 0..1, for the orb. Native emits it; the web API doesn't, so it stays 0 there.
  const [level, setLevel] = useState(0);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    const mod = recognizer();
    if (!mod) return;
    const subs = [
      mod.addListener('result', (e) => {
        const text = e.results[0]?.transcript ?? '';
        if (e.isFinal) {
          setPartial('');
          if (text.trim()) onFinalRef.current(text.trim());
        } else setPartial(text);
      }),
      mod.addListener('volumechange', (e) => setLevel(Math.max(0, Math.min(1, e.value / 10)))),
      mod.addListener('end', () => {
        setLevel(0);
        setState((s) => (s === 'listening' ? 'idle' : s));
      }),
      mod.addListener('error', (e) => {
        setPartial('');
        setState(e.error === 'not-allowed' ? 'denied' : 'idle');
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const start = useCallback(async () => {
    const mod = recognizer();
    if (!mod) return;
    const perm = await mod.requestPermissionsAsync();
    if (!perm.granted) {
      setState('denied');
      return;
    }
    setPartial('');
    setState('listening');
    mod.start({ lang: 'en-US', interimResults: true, continuous: false, volumeChangeEventOptions: { enabled: true, intervalMillis: 90 } });
  }, []);

  const stop = useCallback(() => {
    recognizer()?.stop();
  }, []);

  return { state, partial, level, start, stop };
}
