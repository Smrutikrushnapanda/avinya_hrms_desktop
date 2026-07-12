import { powerMonitor } from 'electron';

export const IDLE_THRESHOLD_SECONDS = 300; // 5 minutes, per CLAUDE.md's idle-detection spec

export function getIdleSeconds(): number {
  return powerMonitor.getSystemIdleTime();
}

export function isIdle(): boolean {
  return getIdleSeconds() >= IDLE_THRESHOLD_SECONDS;
}
