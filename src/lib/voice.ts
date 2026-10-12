/**
 * Speech-to-text for the coach, two ways:
 *  1. Server (preferred): record a short clip, send it to Convex, which transcribes it
 *     with Whisper. Same quality on web and phone, and it works in Expo Go.
 *  2. On-device fallback: expo-speech-recognition (a native module Expo Go lacks) or the
 *     browser's Web Speech API. Used when the server is unreachable, rate-limited or
 *     unconfigured; after a server failure we stay on-device for a couple of minutes.
 */
import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { api } from '../../convex/_generated/api';
import { convex } from '@/lib/convex';
import { useRecorder } from '@/lib/useRecorder';
import { useApp } from '@/store/app-store';

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

export type VoiceState = 'idle' | 'listening' | 'processing' | 'unavailable' | 'denied';

const SERVER_RETRY_MS = 2 * 60_000; // how long to stay on-device after a server failure
const SPEECH_LEVEL = 0.15; // loudness (0..1) that counts as speech
const SILENCE_MS = 1100; // quiet after speech that ends the clip
const NO_SPEECH_MS = 6000; // give up if nobody speaks
const MAX_MS = 12000; // hard cap on clip length

/** Listen once; `onFinal` receives the final transcript. */
export function useVoice(onFinal: (text: string) => void) {
  const rec = useRecorder();
  const recRef = useRef(rec);
  const [state, setState] = useState<VoiceState>(() => (convex || recognizer() ? 'idle' : 'unavailable'));
  const [partial, setPartial] = useState('');
  const [notice, setNotice] = useState('');
  // Input loudness for the orb, 0..1: the recorder's, or the on-device recognizer's when it listens.
  const [deviceLevel, setDeviceLevel] = useState(0);
  const onFinalRef = useRef(onFinal);
  const mode = useRef<'server' | 'device' | null>(null);
  const serverDownUntil = useRef(0);
  const clip = useRef({ startedAt: 0, lastVoiceAt: 0, spoke: false });

  useEffect(() => {
    onFinalRef.current = onFinal;
    recRef.current = rec;
  });

  // On-device recognizer events.
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
      mod.addListener('volumechange', (e) => setDeviceLevel(Math.max(0, Math.min(1, e.value / 10)))),
      mod.addListener('end', () => {
        setDeviceLevel(0);
        setState((s) => (s === 'listening' && mode.current === 'device' ? 'idle' : s));
      }),
      mod.addListener('error', (e) => {
        setPartial('');
        setState(e.error === 'not-allowed' ? 'denied' : 'idle');
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  // Leaving the screen throws away any clip in progress.
  useEffect(
    () => () => {
      if (mode.current === 'server') {
        mode.current = null;
        recRef.current.stop();
      } else if (mode.current === 'device') recognizer()?.stop();
    },
    [],
  );

  const finishServer = useCallback(async () => {
    if (mode.current !== 'server' || !convex) return;
    mode.current = null;
    const audio = await recRef.current.stop();
    if (!audio || !clip.current.spoke) {
      setState('idle');
      return;
    }
    setState('processing');
    try {
      const res = await convex.action(api.stt.transcribe, { deviceId: useApp.getState().deviceId, audio: audio.bytes, mimeType: audio.mimeType });
      if (!('text' in res)) throw new Error(res.error);
      setState('idle');
      if (res.text) onFinalRef.current(res.text);
      else setNotice('I didn’t catch that. Try again.');
    } catch {
      // Server unavailable, rate-limited or not configured: use the on-device recognizer for a while.
      serverDownUntil.current = Date.now() + SERVER_RETRY_MS;
      if (recognizer()) {
        setNotice('Switched to on-device voice. Tap and say it again.');
        setState('idle');
      } else {
        setNotice('Voice is unavailable right now. Type instead.');
        setState('unavailable');
      }
    }
  }, []);

  // While a server clip records, stop it on silence, on timeout, or if nobody speaks.
  useEffect(() => {
    if (state !== 'listening' || mode.current !== 'server') return;
    const timer = setInterval(() => {
      const now = Date.now();
      const c = clip.current;
      if (recRef.current.level > SPEECH_LEVEL) {
        c.spoke = true;
        c.lastVoiceAt = now;
      }
      const elapsed = now - c.startedAt;
      if ((c.spoke && now - c.lastVoiceAt > SILENCE_MS) || elapsed > MAX_MS || (!c.spoke && elapsed > NO_SPEECH_MS)) finishServer();
    }, 150);
    return () => clearInterval(timer);
  }, [state, finishServer]);

  const start = useCallback(async () => {
    setNotice('');
    setPartial('');
    if (convex && Date.now() >= serverDownUntil.current) {
      const result = await recRef.current.start();
      if (result === 'denied') {
        setState('denied');
        return;
      }
      if (result === 'ok') {
        mode.current = 'server';
        clip.current = { startedAt: Date.now(), lastVoiceAt: 0, spoke: false };
        setState('listening');
        return;
      }
    }
    const mod = recognizer();
    if (!mod) {
      setState('unavailable');
      return;
    }
    const perm = await mod.requestPermissionsAsync();
    if (!perm.granted) {
      setState('denied');
      return;
    }
    mode.current = 'device';
    setState('listening');
    mod.start({ lang: 'en-US', interimResults: true, continuous: false, volumeChangeEventOptions: { enabled: true, intervalMillis: 90 } });
  }, []);

  const stop = useCallback(() => {
    if (mode.current === 'server') finishServer();
    else recognizer()?.stop();
  }, [finishServer]);

  return { state, partial, notice, level: Math.max(rec.level, deviceLevel), start, stop };
}
