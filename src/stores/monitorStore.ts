import { create } from 'zustand';
import * as api from '../services/api';
import type { AppSummaryResult, LunchState } from '../../electron/ipcChannels';

const ACTIVITY_BUFFER_SIZE = 60; // ~1 minute of 1s ticks

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

interface MonitorStoreState {
  initialized: boolean;
  isMonitoring: boolean;
  sessionId: string | null;
  sessionStart: string | null;
  currentApp: string | null;
  currentAppWindowTitle: string | null;
  currentAppDurationSec: number;
  idleSeconds: number;
  isIdle: boolean;
  keystrokesSinceFlush: number;
  clicksSinceFlush: number;
  activityBuffer: number[];
  lastFlushAt: string | null;
  accessibilityWarning: boolean;
  screenRecordingWarning: boolean;
  isLunch: boolean;
  lunchStart: string | null;
  lunchEnd: string | null;
  starting: boolean;
  startError: string | null;
  todaySummary: AppSummaryResult | null;
  yesterdaySummary: AppSummaryResult | null;
  /** Whether today's WFH is approved and whether a session has been started —
   *  drives the "Start Monitoring" reminder banner. */
  hasApprovedWfhToday: boolean;
  /** internal — last tick's combined keystroke+click count, used to derive per-tick deltas */
  _prevTickTotal: number;
  /** internal — calendar date (local) as of the last flush/sync, used to detect midnight rollover */
  _lastKnownDate: string;

  init: () => Promise<void>;
  start: () => Promise<boolean>;
  stop: () => Promise<void>;
  toggleLunch: () => Promise<LunchState>;
  refreshTodaySummary: () => Promise<void>;
  refreshYesterdaySummary: () => Promise<void>;
  refreshWfhApprovalStatus: () => Promise<void>;
  syncMonitoringState: () => Promise<void>;
  checkDayRollover: () => Promise<void>;
}

let unsubscribers: Array<() => void> = [];

export const useMonitorStore = create<MonitorStoreState>((set, get) => ({
  initialized: false,
  isMonitoring: false,
  sessionId: null,
  sessionStart: null,
  currentApp: null,
  currentAppWindowTitle: null,
  currentAppDurationSec: 0,
  idleSeconds: 0,
  isIdle: false,
  keystrokesSinceFlush: 0,
  clicksSinceFlush: 0,
  activityBuffer: [],
  lastFlushAt: null,
  accessibilityWarning: false,
  screenRecordingWarning: false,
  isLunch: false,
  lunchStart: null,
  lunchEnd: null,
  starting: false,
  startError: null,
  todaySummary: null,
  yesterdaySummary: null,
  hasApprovedWfhToday: false,
  _prevTickTotal: 0,
  _lastKnownDate: todayIsoDate(),

  init: async () => {
    if (get().initialized) return;

    unsubscribers.forEach((unsub) => unsub());
    unsubscribers = [
      api.onMonitoringTick((tick) => {
        const combined = tick.keystrokesSinceFlush + tick.clicksSinceFlush;
        const prev = get()._prevTickTotal;
        const delta = combined >= prev ? combined - prev : combined;
        set((state) => ({
          currentApp: tick.currentApp,
          currentAppWindowTitle: tick.currentAppWindowTitle,
          currentAppDurationSec: tick.currentAppDurationSec,
          idleSeconds: tick.idleSeconds,
          isIdle: tick.isIdle,
          keystrokesSinceFlush: tick.keystrokesSinceFlush,
          clicksSinceFlush: tick.clicksSinceFlush,
          _prevTickTotal: combined,
          activityBuffer: [...state.activityBuffer.slice(-(ACTIVITY_BUFFER_SIZE - 1)), delta],
        }));
      }),
      api.onMonitoringFlush((flush) => {
        set({ lastFlushAt: flush.flushedAt });
        void get().checkDayRollover();
        void get().refreshTodaySummary();
      }),
      // Re-fetch full state (not just the push payload) so sessionStart stays
      // correct even when monitoring is toggled from the tray menu.
      api.onMonitoringSessionChanged(() => {
        void get().syncMonitoringState();
      }),
      api.onMonitoringPermissionWarning((warning) => {
        if (warning.missing === 'accessibility') set({ accessibilityWarning: true });
        if (warning.missing === 'screenRecording') set({ screenRecordingWarning: true });
      }),
    ];

    await get().syncMonitoringState();
    set({ initialized: true });
    await Promise.all([
      get().refreshTodaySummary(),
      get().refreshYesterdaySummary(),
      get().refreshWfhApprovalStatus(),
    ]);
  },

  start: async () => {
    set({ starting: true, startError: null });
    const result = await api.startMonitoring();
    if (result.ok) {
      set({
        starting: false,
        isMonitoring: true,
        sessionId: result.sessionId ?? null,
        sessionStart: result.sessionStart ?? null,
        activityBuffer: [],
        _prevTickTotal: 0,
        accessibilityWarning: false,
        screenRecordingWarning: false,
      });
      return true;
    }
    set({ starting: false, startError: result.error || 'Could not start monitoring' });
    return false;
  },

  stop: async () => {
    await api.stopMonitoring();
    set({
      isMonitoring: false,
      sessionId: null,
      sessionStart: null,
      currentApp: null,
      currentAppWindowTitle: null,
      keystrokesSinceFlush: 0,
      clicksSinceFlush: 0,
      activityBuffer: [],
    });
    await get().refreshTodaySummary();
  },

  toggleLunch: async () => {
    const result = await api.toggleLunch();
    set({
      isLunch: result.isLunch,
      lunchStart: result.lunchStart,
      lunchEnd: result.lunchEnd,
    });
    await get().refreshTodaySummary();
    return result;
  },

  refreshTodaySummary: async () => {
    try {
      const summary = await api.getTodaySummary();
      set({ todaySummary: summary });
    } catch {
      // backend unreachable — keep previous summary
    }
  },

  refreshYesterdaySummary: async () => {
    try {
      const summary = await api.getTodaySummary(yesterdayIsoDate());
      set({ yesterdaySummary: summary });
    } catch {
      // backend unreachable — keep previous summary
    }
  },

  refreshWfhApprovalStatus: async () => {
    try {
      const result = await api.getTodayMonitoring();
      set({ hasApprovedWfhToday: Boolean(result?.hasApprovedWfh) });
    } catch {
      // backend unreachable — keep previous value
    }
  },

  syncMonitoringState: async () => {
    const state = await api.getMonitoringState();
    set({
      isMonitoring: state.isMonitoring,
      sessionId: state.sessionId,
      sessionStart: state.sessionStart,
      currentApp: state.currentApp,
      currentAppWindowTitle: state.currentAppWindowTitle,
      currentAppDurationSec: state.currentAppDurationSec,
      idleSeconds: state.idleSeconds,
      isIdle: state.isIdle,
      // Monitoring was auto-stopped server-side (e.g. a session left active
      // overnight rolled into a day with no approved WFH) — surface why.
      ...(state.haltReason ? { startError: state.haltReason } : {}),
    });
    await get().checkDayRollover();
  },

  /**
   * The app can sit minimized in the tray across midnight. Without this, a
   * multi-day-old session keeps rendering the day it was launched on:
   * "Today's Summary" would silently keep showing the original day's
   * numbers and "vs yesterday" would compare against whatever was
   * yesterday when the app first started, not the actual previous day.
   */
  checkDayRollover: async () => {
    const today = todayIsoDate();
    if (get()._lastKnownDate === today) return;
    set({ _lastKnownDate: today, activityBuffer: [], _prevTickTotal: 0 });
    await Promise.all([
      get().refreshTodaySummary(),
      get().refreshYesterdaySummary(),
      get().refreshWfhApprovalStatus(),
    ]);
  },
}));
