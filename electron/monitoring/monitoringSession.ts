import { api } from '../apiClient';
import { getCurrentWindow, isActiveWindowLikelyBlocked } from './activeWindowPoller';
import { getIdleSeconds, isIdle } from './idleTracker';
import { startInputHook, stopInputHook, didInputHookFailToStart } from './inputHookManager';
import { BatchAggregator } from './batchAggregator';
import { drainQueue, enqueue } from './offlineQueue';
import type { AppActivityEntry } from './types';
import {
  IpcEvent,
  type MonitoringFlushPayload,
  type MonitoringSessionChangedPayload,
  type MonitoringState,
  type MonitoringTickPayload,
  type StartMonitoringResult,
} from '../ipcChannels';

const POLL_INTERVAL_MS = 1000;
const FLUSH_INTERVAL_MS = 15000;
const UNKNOWN_APP = 'Unknown';

type Emitter = (channel: string, payload: unknown) => void;
let emit: Emitter = () => {};

export function setEmitter(fn: Emitter): void {
  emit = fn;
}

let isMonitoringFlag = false;
let sessionId: string | null = null;
let sessionStart: string | null = null;
let currentAppName: string | null = null;
let currentAppWindowTitle: string | null = null;
let currentAppFocusStartedAt = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let screenRecordingWarningEmitted = false;
let haltReason: string | null = null;
const aggregator = new BatchAggregator();

function extractErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { message?: string } } };
  return anyErr.response?.data?.message || 'Something went wrong. Please try again.';
}

/**
 * Called when the app has been running long enough to cross into a new day
 * (session left active in the tray overnight). The backend rotates the
 * session and re-checks today's WFH approval on the next activity post; if
 * that rotation is rejected (e.g. no approved WFH today), don't keep
 * silently queueing the batch offline forever — halt monitoring locally so
 * the UI reflects it and the employee can see why.
 */
async function haltDueToRejection(message: string): Promise<void> {
  if (!isMonitoringFlag) return;
  haltTimers();
  isMonitoringFlag = false;
  sessionId = null;
  sessionStart = null;
  currentAppName = null;
  currentAppWindowTitle = null;
  haltReason = message;
  emitSessionChanged();
}

async function postAppActivity(entries: AppActivityEntry[]): Promise<boolean> {
  try {
    await api.post('/wfh-monitoring/app-activity', { entries });
    return true;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 400 || status === 403) {
      await haltDueToRejection(extractErrorMessage(err));
      return true; // rejected by policy, not a network blip — don't requeue
    }
    return false;
  }
}

function toActivityEntries(): AppActivityEntry[] {
  const nowIso = new Date().toISOString();
  const today = nowIso.split('T')[0];
  return aggregator.flush().map((e) => ({
    appName: e.appName,
    windowTitle: e.windowTitle ?? undefined,
    keystrokeCount: e.keystrokeCount,
    mouseClicks: e.mouseClicks,
    durationSeconds: Math.max(e.durationSeconds, 1),
    occurredAt: nowIso,
    date: today,
  }));
}

async function pollTick(): Promise<void> {
  const win = await getCurrentWindow();
  const appName = win?.appName ?? UNKNOWN_APP;
  const windowTitle = win?.windowTitle ?? null;

  if (!screenRecordingWarningEmitted && isActiveWindowLikelyBlocked()) {
    screenRecordingWarningEmitted = true;
    emit(IpcEvent.MonitoringPermissionWarning, { missing: 'screenRecording' });
  }

  if (appName !== currentAppName) {
    currentAppName = appName;
    currentAppFocusStartedAt = Date.now();
  }
  currentAppWindowTitle = windowTitle;

  const idleSeconds = getIdleSeconds();
  const idle = isIdle();
  aggregator.recordTick(appName, windowTitle, !idle);

  const counts = aggregator.getCurrentCounts(appName);
  const payload: MonitoringTickPayload = {
    currentApp: appName,
    currentAppWindowTitle: windowTitle,
    currentAppDurationSec: Math.floor((Date.now() - currentAppFocusStartedAt) / 1000),
    idleSeconds,
    isIdle: idle,
    keystrokesSinceFlush: counts.keystrokeCount,
    clicksSinceFlush: counts.mouseClicks,
  };
  emit(IpcEvent.MonitoringTick, payload);
}

async function flushTick(): Promise<void> {
  await drainQueue(postAppActivity);

  if (aggregator.isEmpty()) return;

  const entries = toActivityEntries();
  const ok = await postAppActivity(entries);
  if (!ok) enqueue(entries);

  const payload: MonitoringFlushPayload = {
    flushedAt: new Date().toISOString(),
    entriesCount: entries.length,
    queuedOffline: !ok,
  };
  emit(IpcEvent.MonitoringFlush, payload);
}

function emitSessionChanged(): void {
  const payload: MonitoringSessionChangedPayload = {
    isMonitoring: isMonitoringFlag,
    sessionId,
  };
  emit(IpcEvent.MonitoringSessionChanged, payload);
}

function haltTimers(): void {
  if (pollTimer) clearInterval(pollTimer);
  if (flushTimer) clearInterval(flushTimer);
  pollTimer = null;
  flushTimer = null;
  stopInputHook();
}

async function flushRemaining(withTimeout?: number): Promise<void> {
  if (aggregator.isEmpty()) return;
  const entries = toActivityEntries();

  const attempt = postAppActivity(entries);
  const ok = withTimeout
    ? await Promise.race([
        attempt,
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), withTimeout)),
      ])
    : await attempt;

  if (!ok) enqueue(entries);
}

export async function start(): Promise<StartMonitoringResult> {
  if (isMonitoringFlag) {
    return { ok: true, sessionId: sessionId ?? undefined, sessionStart: sessionStart ?? undefined };
  }

  try {
    const { data } = await api.post('/wfh-monitoring/session/start');
    sessionId = data.sessionId;
    sessionStart = data.sessionStart;
  } catch (err) {
    return { ok: false, error: extractErrorMessage(err) };
  }

  isMonitoringFlag = true;
  currentAppName = null;
  currentAppWindowTitle = null;
  currentAppFocusStartedAt = Date.now();
  screenRecordingWarningEmitted = false;
  haltReason = null;

  const hookStarted = startInputHook({
    onKeydown: () => currentAppName && aggregator.recordKeystroke(currentAppName),
    onClick: () => currentAppName && aggregator.recordClick(currentAppName),
  });
  if (!hookStarted || didInputHookFailToStart()) {
    emit(IpcEvent.MonitoringPermissionWarning, { missing: 'accessibility' });
  }

  await pollTick();
  pollTimer = setInterval(() => void pollTick(), POLL_INTERVAL_MS);
  flushTimer = setInterval(() => void flushTick(), FLUSH_INTERVAL_MS);

  await drainQueue(postAppActivity);

  emitSessionChanged();
  return { ok: true, sessionId: sessionId ?? undefined, sessionStart: sessionStart ?? undefined };
}

export async function stop(): Promise<void> {
  if (!isMonitoringFlag) return;

  haltTimers();
  await flushRemaining();

  try {
    await api.post('/wfh-monitoring/session/end');
  } catch {
    // Left is_active:true server-side; startSession()'s dangling-session
    // cleanup handles this automatically on the next session start.
  }

  isMonitoringFlag = false;
  sessionId = null;
  sessionStart = null;
  currentAppName = null;
  currentAppWindowTitle = null;
  emitSessionChanged();
}

/** Best-effort stop used only from the app quit handler — never blocks quitting for long. */
export async function quitFlush(timeoutMs = 3000): Promise<void> {
  if (!isMonitoringFlag) return;
  haltTimers();
  await flushRemaining(timeoutMs);
  await Promise.race([
    api.post('/wfh-monitoring/session/end').catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  isMonitoringFlag = false;
}

export function isMonitoring(): boolean {
  return isMonitoringFlag;
}

export function getState(): MonitoringState {
  return {
    isMonitoring: isMonitoringFlag,
    sessionId,
    sessionStart,
    currentApp: currentAppName,
    currentAppWindowTitle,
    currentAppDurationSec: currentAppFocusStartedAt
      ? Math.floor((Date.now() - currentAppFocusStartedAt) / 1000)
      : 0,
    idleSeconds: getIdleSeconds(),
    isIdle: isIdle(),
    haltReason,
  };
}
