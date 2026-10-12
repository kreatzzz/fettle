/**
 * Desktop web only: shows the app inside an iPhone 17 shaped window (402 x 874 pt) so
 * reviewers on a computer see the mobile layout, with a credit line underneath.
 * On narrow screens (a real phone browser) the app simply fills the screen.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

const SCREEN_W = 402;
const SCREEN_H = 874;
const BEZEL = 10;
const FRAME_W = SCREEN_W + BEZEL * 2;
const FRAME_H = SCREEN_H + BEZEL * 2;
const FOOTER_H = 100; // room kept free below the phone for the credit line
const DESKTOP_MIN_WIDTH = 600;
// Always the newest release; the APK is attached to it.
const RELEASES_URL = 'https://github.com/kreatzzz/fettle/releases/latest';
const pill = { padding: '7px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', textDecoration: 'none', fontWeight: 500 } as const;

// Stand-ins for the iPhone's status bar / home indicator areas.
const INSETS = { top: 44, bottom: 24, left: 0, right: 0 };

export function WebFrame({ children }: { children: ReactNode }) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (size.w < DESKTOP_MIN_WIDTH) return <>{children}</>;

  // Shrink (never enlarge) so the whole phone and the credit line fit the window.
  const scale = Math.min(1, (size.h - FOOTER_H) / FRAME_H);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: 'radial-gradient(ellipse at 50% 0%, #1C1B20 0%, #0E0D10 60%)',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: FRAME_W * scale, height: FRAME_H * scale, flexShrink: 0 }}>
        <div
          style={{
            width: FRAME_W,
            height: FRAME_H,
            boxSizing: 'border-box',
            padding: BEZEL,
            borderRadius: 64,
            background: '#1A1A1E',
            boxShadow: '0 0 0 1.5px #34343A, 0 40px 90px rgba(0,0,0,0.55)',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <div style={{ position: 'relative', width: SCREEN_W, height: SCREEN_H, borderRadius: 54, overflow: 'hidden', background: '#000', display: 'flex' }}>
            <SafeAreaInsetsContext.Provider value={INSETS}>
              <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex' }}>{children}</div>
            </SafeAreaInsetsContext.Provider>
            {/* Dynamic Island */}
            <div style={{ position: 'absolute', top: 11, left: '50%', width: 124, height: 36, marginLeft: -62, borderRadius: 18, background: '#000', pointerEvents: 'none', zIndex: 1000 }} />
          </div>
        </div>
      </div>
      <div style={{ height: FOOTER_H - 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, fontFamily: 'Inter, system-ui, -apple-system, sans-serif', fontSize: 14, color: '#8F8C86' }}>
        <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" style={{ ...pill, color: '#F4F2EE' }}>
          Get the Android app (APK)
        </a>
        <span>
          Made with love by{' '}
          <a href="https://krishgupta.me" target="_blank" rel="noopener noreferrer" style={{ color: '#F4F2EE', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            krishgupta.me
          </a>
        </span>
      </div>
    </div>
  );
}
