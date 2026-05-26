// Screen Wake Lock — keep the device awake during a meditation session.
//
// Browsers auto-release a wake lock when the tab is backgrounded; we
// reacquire on visibilitychange while a session is still active.
//
// Best-effort: silently no-ops on browsers without Wake Lock API
// (older Safari < 16.4, in-app browsers, etc.). Caller doesn't need
// to await — fire and forget.

interface WakeLockSentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

interface WakeLockNavigator {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
}

let sentinel: WakeLockSentinel | null = null;
let active = false;

async function acquire(): Promise<void> {
  const wl = (navigator as unknown as WakeLockNavigator).wakeLock;
  if (!wl) return;
  try {
    sentinel = await wl.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    /* user agent denied or device unavailable */
  }
}

/** Begin holding the screen awake. Idempotent. */
export function acquireWakeLock(): void {
  active = true;
  void acquire();
}

/** Stop holding the screen awake. Idempotent. */
export function releaseWakeLock(): void {
  active = false;
  if (sentinel && !sentinel.released) {
    void sentinel.release();
  }
  sentinel = null;
}

/**
 * Wire up a visibility listener that reacquires the wake lock when the
 * tab becomes visible again — browsers release it automatically when
 * the tab is hidden. Returns a cleanup function.
 */
export function installWakeLockReacquire(): () => void {
  const onVisibility = () => {
    if (active && document.visibilityState === 'visible' && !sentinel) {
      void acquire();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => document.removeEventListener('visibilitychange', onVisibility);
}
