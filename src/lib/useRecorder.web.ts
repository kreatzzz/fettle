/**
 * Web twin of useRecorder.ts: MediaRecorder for the clip, a WebAudio analyser for loudness.
 * Needs a secure context (https or localhost) and a granted microphone.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type Clip = { bytes: ArrayBuffer; mimeType: string };
export type StartResult = 'ok' | 'denied' | 'error';

type Session = { stream: MediaStream; rec: MediaRecorder; chunks: Blob[]; ctx: AudioContext; timer: ReturnType<typeof setInterval>; mime: string };

const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));

export function useRecorder() {
  const [level, setLevel] = useState(0);
  const session = useRef<Session | null>(null);

  const cleanup = useCallback(() => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    clearInterval(s.timer);
    s.stream.getTracks().forEach((t) => t.stop());
    s.ctx.close().catch(() => {});
    setLevel(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async (): Promise<StartResult> => {
    const mime = pickMime();
    if (!mime || !navigator.mediaDevices?.getUserMedia) return 'error';
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch {
      return 'denied';
    }
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const timer = setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const v of samples) sum += ((v - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 5));
      }, 100);
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.start();
      session.current = { stream, rec, chunks, ctx, timer, mime };
      return 'ok';
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      return 'error';
    }
  }, []);

  const stop = useCallback((): Promise<Clip | null> => {
    const s = session.current;
    if (!s) return Promise.resolve(null);
    return new Promise((resolve) => {
      s.rec.onstop = async () => {
        const blob = new Blob(s.chunks, { type: s.mime.split(';')[0] });
        cleanup();
        resolve(blob.size ? { bytes: await blob.arrayBuffer(), mimeType: blob.type } : null);
      };
      try {
        s.rec.stop();
      } catch {
        cleanup();
        resolve(null);
      }
    });
  }, [cleanup]);

  return { start, stop, level };
}
