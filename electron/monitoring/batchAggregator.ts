interface AppAccumulator {
  windowTitle: string | null;
  keystrokeCount: number;
  mouseClicks: number;
  durationSeconds: number;
}

export interface FlushedEntry {
  appName: string;
  windowTitle: string | null;
  keystrokeCount: number;
  mouseClicks: number;
  durationSeconds: number;
}

/**
 * Accumulates per-app keystroke/click/duration counters across a 60s window,
 * keyed by app name so switching back and forth between the same apps
 * doesn't fragment their totals. Cleared only on flush().
 */
export class BatchAggregator {
  private apps = new Map<string, AppAccumulator>();

  private getOrCreate(appName: string): AppAccumulator {
    let entry = this.apps.get(appName);
    if (!entry) {
      entry = { windowTitle: null, keystrokeCount: 0, mouseClicks: 0, durationSeconds: 0 };
      this.apps.set(appName, entry);
    }
    return entry;
  }

  recordTick(appName: string, windowTitle: string | null, countDuration: boolean): void {
    const entry = this.getOrCreate(appName);
    entry.windowTitle = windowTitle;
    if (countDuration) entry.durationSeconds += 1;
  }

  recordKeystroke(appName: string): void {
    this.getOrCreate(appName).keystrokeCount += 1;
  }

  recordClick(appName: string): void {
    this.getOrCreate(appName).mouseClicks += 1;
  }

  getCurrentCounts(appName: string): { keystrokeCount: number; mouseClicks: number } {
    const entry = this.apps.get(appName);
    return {
      keystrokeCount: entry?.keystrokeCount ?? 0,
      mouseClicks: entry?.mouseClicks ?? 0,
    };
  }

  isEmpty(): boolean {
    return this.apps.size === 0;
  }

  flush(): FlushedEntry[] {
    const entries: FlushedEntry[] = Array.from(this.apps.entries()).map(
      ([appName, acc]) => ({
        appName,
        windowTitle: acc.windowTitle,
        keystrokeCount: acc.keystrokeCount,
        mouseClicks: acc.mouseClicks,
        durationSeconds: acc.durationSeconds,
      }),
    );
    this.apps.clear();
    return entries;
  }
}
