// Shared between the main process and the renderer (via preload's contextBridge).
// Contains no Node-only imports so it's safe to include from renderer TS sources too.

export const IpcInvoke = {
  Login: 'hrms:login',
  Logout: 'hrms:logout',
  GetAuthState: 'hrms:getAuthState',
  GetTermsText: 'hrms:getTermsText',
  GetTermsStatus: 'hrms:getTermsStatus',
  AcceptTerms: 'hrms:acceptTerms',
  CheckPermissions: 'hrms:checkPermissions',
  OpenPermissionSettings: 'hrms:openPermissionSettings',
  StartMonitoring: 'hrms:startMonitoring',
  StopMonitoring: 'hrms:stopMonitoring',
  ToggleLunch: 'hrms:toggleLunch',
  GetMonitoringState: 'hrms:getMonitoringState',
  GetTodaySummary: 'hrms:getTodaySummary',
  QuitApp: 'hrms:quitApp',
} as const;

export const IpcEvent = {
  MonitoringTick: 'monitoring:tick',
  MonitoringFlush: 'monitoring:flush',
  MonitoringSessionChanged: 'monitoring:session-changed',
  MonitoringPermissionWarning: 'monitoring:permission-warning',
  AuthExpired: 'auth:expired',
} as const;

export interface AuthUser {
  userId: string;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationId: string;
  mustChangePassword: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

export interface LoginResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

export interface TermsTextResult {
  version: string;
  text: string;
}

export interface TermsStatusResult {
  accepted: boolean;
  upToDate: boolean;
  acceptedAt: string | null;
  tacVersion: string | null;
  currentVersion: string;
}

export interface PermissionsState {
  accessibilityGranted: boolean;
  screenRecordingGranted: boolean;
}

export type PermissionKind = 'accessibility' | 'screenRecording';

export interface LunchState {
  isLunch: boolean;
  lunchStart: string | null;
  lunchEnd: string | null;
}

export interface StartMonitoringResult {
  ok: boolean;
  sessionId?: string;
  sessionStart?: string;
  error?: string;
}

export interface MonitoringState {
  isMonitoring: boolean;
  sessionId: string | null;
  sessionStart: string | null;
  currentApp: string | null;
  currentAppWindowTitle: string | null;
  currentAppDurationSec: number;
  idleSeconds: number;
  isIdle: boolean;
  /** Set when monitoring was auto-stopped by the backend (e.g. a session
   *  left active overnight rolled into a day with no approved WFH). */
  haltReason?: string | null;
}

export interface MonitoringTickPayload {
  currentApp: string | null;
  currentAppWindowTitle: string | null;
  currentAppDurationSec: number;
  idleSeconds: number;
  isIdle: boolean;
  keystrokesSinceFlush: number;
  clicksSinceFlush: number;
}

export interface MonitoringFlushPayload {
  flushedAt: string;
  entriesCount: number;
  queuedOffline: boolean;
}

export interface MonitoringSessionChangedPayload {
  isMonitoring: boolean;
  sessionId: string | null;
}

export interface AppSummaryApp {
  appName: string;
  keystrokeCount: number;
  mouseClicks: number;
  durationSeconds: number;
}

export interface AppSummaryResult {
  date: string;
  apps: AppSummaryApp[];
  totals: { keystrokes: number; clicks: number; durationSeconds: number };
}

/**
 * The window.hrms surface exposed by preload.ts via contextBridge. Defined
 * here (not derived from preload.ts) so renderer code can import the type
 * without pulling in preload's `electron` (ipcRenderer/contextBridge) imports.
 */
export interface HrmsBridge {
  login(userName: string, password: string): Promise<LoginResult>;
  logout(): Promise<{ ok: true }>;
  getAuthState(): Promise<AuthState>;
  getTermsText(): Promise<TermsTextResult>;
  getTermsStatus(): Promise<TermsStatusResult>;
  acceptTerms(tacVersion: string): Promise<TermsStatusResult>;
  checkPermissions(): Promise<PermissionsState>;
  openPermissionSettings(kind: PermissionKind): Promise<void>;
  startMonitoring(): Promise<StartMonitoringResult>;
  stopMonitoring(): Promise<void>;
  toggleLunch(): Promise<LunchState>;
  getMonitoringState(): Promise<MonitoringState>;
  getTodaySummary(date?: string): Promise<AppSummaryResult>;
  quitApp(): Promise<void>;
  onMonitoringTick(cb: (payload: MonitoringTickPayload) => void): () => void;
  onMonitoringFlush(cb: (payload: MonitoringFlushPayload) => void): () => void;
  onMonitoringSessionChanged(
    cb: (payload: MonitoringSessionChangedPayload) => void,
  ): () => void;
  onMonitoringPermissionWarning(
    cb: (payload: { missing: PermissionKind }) => void,
  ): () => void;
  onAuthExpired(cb: () => void): () => void;
}
