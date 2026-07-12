import Store from 'electron-store';
import type { AppActivityEntry } from './types';

const MAX_QUEUED_BATCHES = 500; // ~8+ hours at one flush/minute

interface QueueSchema {
  batches: AppActivityEntry[][];
}

const store = new Store<QueueSchema>({
  name: 'hrms-offline-queue',
  defaults: { batches: [] },
});

export function enqueue(entries: AppActivityEntry[]): void {
  const batches = store.get('batches');
  batches.push(entries);
  if (batches.length > MAX_QUEUED_BATCHES) {
    batches.splice(0, batches.length - MAX_QUEUED_BATCHES);
  }
  store.set('batches', batches);
}

export function hasQueued(): boolean {
  return store.get('batches').length > 0;
}

/**
 * Drains queued batches oldest-first, each as its own POST via postFn, so one
 * bad/oversized batch can't block everything behind it. Stops permanently
 * failing further drains once postFn reports a failure (assume still offline).
 */
export async function drainQueue(
  postFn: (entries: AppActivityEntry[]) => Promise<boolean>,
): Promise<void> {
  let batches = store.get('batches');
  while (batches.length > 0) {
    const [next, ...rest] = batches;
    const ok = await postFn(next);
    if (!ok) return;
    batches = rest;
    store.set('batches', batches);
  }
}
