// Thin wrapper over window.hrms (the IPC bridge exposed by preload.ts).
// Function names/signatures mirror hrms-mobile-app/api/api.ts so page
// components read identically to the mobile app's pattern — only the
// transport differs (IPC here, HTTP there); the JWT never enters this process.
import type { PermissionKind } from '../../electron/ipcChannels';

export const login = (userName: string, password: string) =>
  window.hrms.login(userName, password);

export const logout = () => window.hrms.logout();

export const getAuthState = () => window.hrms.getAuthState();

export const getTermsText = () => window.hrms.getTermsText();

export const getTermsStatus = () => window.hrms.getTermsStatus();

export const acceptTerms = (tacVersion: string) => window.hrms.acceptTerms(tacVersion);

export const checkPermissions = () => window.hrms.checkPermissions();

export const openPermissionSettings = (kind: PermissionKind) =>
  window.hrms.openPermissionSettings(kind);

export const startMonitoring = () => window.hrms.startMonitoring();

export const stopMonitoring = () => window.hrms.stopMonitoring();

export const toggleLunch = () => window.hrms.toggleLunch();

export const getMonitoringState = () => window.hrms.getMonitoringState();

export const getTodaySummary = (date?: string) => window.hrms.getTodaySummary(date);

export const quitApp = () => window.hrms.quitApp();

export const onMonitoringTick = (...args: Parameters<typeof window.hrms.onMonitoringTick>) =>
  window.hrms.onMonitoringTick(...args);

export const onMonitoringFlush = (...args: Parameters<typeof window.hrms.onMonitoringFlush>) =>
  window.hrms.onMonitoringFlush(...args);

export const onMonitoringSessionChanged = (
  ...args: Parameters<typeof window.hrms.onMonitoringSessionChanged>
) => window.hrms.onMonitoringSessionChanged(...args);

export const onMonitoringPermissionWarning = (
  ...args: Parameters<typeof window.hrms.onMonitoringPermissionWarning>
) => window.hrms.onMonitoringPermissionWarning(...args);

export const onAuthExpired = (...args: Parameters<typeof window.hrms.onAuthExpired>) =>
  window.hrms.onAuthExpired(...args);
