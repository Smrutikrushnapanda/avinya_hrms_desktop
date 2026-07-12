// get-windows is ESM-only; the rest of the main process is CJS, so it must
// be loaded via a dynamic import (works fine from CJS at runtime).
type ActiveWindowFn = (options?: {
  accessibilityPermission?: boolean;
  screenRecordingPermission?: boolean;
}) => Promise<{ title: string; owner: { name: string } } | undefined>;

let activeWindowFn: ActiveWindowFn | null = null;
let loadFailed = false;

async function loadActiveWindow(): Promise<ActiveWindowFn | null> {
  if (activeWindowFn) return activeWindowFn;
  if (loadFailed) return null;
  try {
    const mod = await import('get-windows');
    activeWindowFn = mod.activeWindow as ActiveWindowFn;
    return activeWindowFn;
  } catch (err) {
    loadFailed = true;
    console.error('[activeWindowPoller] failed to load get-windows module:', err);
    return null;
  }
}

export interface CurrentWindow {
  appName: string;
  windowTitle: string | null;
}

let consecutiveFailures = 0;
let lastLoggedFailure = 0;

// We only use `owner`/`title` — never `.url` (which needs get-windows' own
// accessibility-permission gate). Disabling it here means we only ever
// require Screen Recording permission for this call, not Accessibility too.
const ACTIVE_WINDOW_OPTIONS = {
  accessibilityPermission: false,
  screenRecordingPermission: true,
};

export async function getCurrentWindow(): Promise<CurrentWindow | null> {
  const fn = await loadActiveWindow();
  if (!fn) return null;

  try {
    const result = await fn(ACTIVE_WINDOW_OPTIONS);
    consecutiveFailures = 0;
    if (!result) return null;
    return {
      appName: result.owner.name,
      windowTitle: result.title || null,
    };
  } catch (err) {
    consecutiveFailures += 1;
    // Throttle logging — this fires once per second from the poll loop, so
    // don't spam the console for a persistent permission problem.
    const now = Date.now();
    if (now - lastLoggedFailure > 30_000) {
      lastLoggedFailure = now;
      console.error(
        `[activeWindowPoller] activeWindow() failed (${consecutiveFailures} consecutive) — ` +
          'most commonly a missing/denied macOS Screen Recording permission:',
        err,
      );
    }
    return null;
  }
}

/** True once we've failed to resolve the active window 3+ times in a row (~3s). */
export function isActiveWindowLikelyBlocked(): boolean {
  return consecutiveFailures >= 3;
}
