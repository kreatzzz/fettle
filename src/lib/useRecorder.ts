/**
 * Microphone recorder for server-side speech-to-text (native). Records a small mono
 * AAC clip and reports loudness so the caller can detect when you stop talking.
 * The web twin is useRecorder.web.ts; both expose the same shape.
 */
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback } from 'react';

export type Clip = { bytes: ArrayBuffer; mimeType: string };
export type StartResult = 'ok' | 'denied' | 'error';

// 16 kHz mono at a low bit rate: ~4 KB per second, plenty for speech.
const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, sampleRate: 16000, numberOfChannels: 1, bitRate: 32000, isMeteringEnabled: true };

export function useRecorder() {
  const recorder = useAudioRecorder(OPTIONS);
  const status = useAudioRecorderState(recorder, 100);
  // Metering is in dB (about -55 quiet to 0 loud); map it to 0..1.
  const level = status.isRecording && status.metering != null ? Math.max(0, Math.min(1, (status.metering + 55) / 55)) : 0;

  const start = useCallback(async (): Promise<StartResult> => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return 'denied';
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return 'ok';
    } catch {
      return 'error';
    }
  }, [recorder]);

  const stop = useCallback(async (): Promise<Clip | null> => {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (!recorder.uri) return null;
      return { bytes: await new File(recorder.uri).arrayBuffer(), mimeType: 'audio/mp4' };
    } catch {
      return null;
    }
  }, [recorder]);

  return { start, stop, level };
}
