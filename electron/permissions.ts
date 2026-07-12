import { shell, systemPreferences } from 'electron';
import type { PermissionKind, PermissionsState } from './ipcChannels';

const MAC_SETTINGS_URL: Record<PermissionKind, string> = {
  accessibility:
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  screenRecording:
    'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
};

export function checkPermissions(): PermissionsState {
  if (process.platform !== 'darwin') {
    // Accessibility/Screen Recording TCC prompts are a macOS-only concept.
    return { accessibilityGranted: true, screenRecordingGranted: true };
  }

  return {
    accessibilityGranted: systemPreferences.isTrustedAccessibilityClient(false),
    screenRecordingGranted:
      systemPreferences.getMediaAccessStatus('screen') === 'granted',
  };
}

export async function openPermissionSettings(
  kind: PermissionKind,
): Promise<void> {
  if (process.platform !== 'darwin') return;
  await shell.openExternal(MAC_SETTINGS_URL[kind]);
}
