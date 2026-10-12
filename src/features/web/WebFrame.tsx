import type { ReactNode } from 'react';

/** Native: nothing to frame. The web version (WebFrame.web.tsx) shows the app in an iPhone-shaped window on desktops. */
export function WebFrame({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
