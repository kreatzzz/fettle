/** A shared minute clock so derived views ("today", decay) stay current without Date.now() in render. */
import { useSyncExternalStore } from 'react';

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  timer ??= setInterval(() => {
    now = Date.now();
    listeners.forEach((l) => l());
  }, 60_000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const snapshot = () => now;

export function useNow() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Refresh the clock right away, e.g. after logging something. */
export function tick() {
  now = Date.now();
  listeners.forEach((l) => l());
}
