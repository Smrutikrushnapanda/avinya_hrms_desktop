// Counts global keydown/click events only — never reads key codes, characters,
// or click coordinates into any stored value. Privacy-first by construction.
import { uIOhook } from 'uiohook-napi';

type CountHandler = () => void;

let started = false;
let onKeydown: CountHandler | null = null;
let onClick: CountHandler | null = null;
let startFailed = false;

export function startInputHook(handlers: {
  onKeydown: CountHandler;
  onClick: CountHandler;
}): boolean {
  onKeydown = handlers.onKeydown;
  onClick = handlers.onClick;

  if (started) return true;

  try {
    uIOhook.on('keydown', () => onKeydown?.());
    uIOhook.on('click', () => onClick?.());
    uIOhook.start();
    started = true;
    startFailed = false;
    return true;
  } catch {
    // Most commonly a missing macOS Accessibility grant. App/duration
    // tracking via the active-window poller keeps working regardless;
    // keystroke/click counts simply stay at 0 until permission is granted.
    startFailed = true;
    return false;
  }
}

export function stopInputHook(): void {
  if (!started) return;
  try {
    uIOhook.stop();
    uIOhook.removeAllListeners('keydown');
    uIOhook.removeAllListeners('click');
  } finally {
    started = false;
    onKeydown = null;
    onClick = null;
  }
}

export function didInputHookFailToStart(): boolean {
  return startFailed;
}
