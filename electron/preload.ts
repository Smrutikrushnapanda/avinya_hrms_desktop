import { contextBridge, ipcRenderer } from 'electron';
import { IpcEvent, IpcInvoke } from './ipcChannels';
import type {
  AppSummaryResult,
  AuthState,
  HrmsBridge,
  LoginResult,
  LunchState,
  MonitoringFlushPayload,
  MonitoringSessionChangedPayload,
  MonitoringState,
  MonitoringTickPayload,
  PermissionKind,
  PermissionsState,
  StartMonitoringResult,
  TermsStatusResult,
  TermsTextResult,
} from './ipcChannels';

const hrms: HrmsBridge = {
  login: (userName: string, password: string): Promise<LoginResult> =>
    ipcRenderer.invoke(IpcInvoke.Login, userName, password),

  logout: (): Promise<{ ok: true }> => ipcRenderer.invoke(IpcInvoke.Logout),

  getAuthState: (): Promise<AuthState> => ipcRenderer.invoke(IpcInvoke.GetAuthState),

  getTermsText: (): Promise<TermsTextResult> => ipcRenderer.invoke(IpcInvoke.GetTermsText),

  getTermsStatus: (): Promise<TermsStatusResult> =>
    ipcRenderer.invoke(IpcInvoke.GetTermsStatus),

  acceptTerms: (tacVersion: string): Promise<TermsStatusResult> =>
    ipcRenderer.invoke(IpcInvoke.AcceptTerms, tacVersion),

  checkPermissions: (): Promise<PermissionsState> =>
    ipcRenderer.invoke(IpcInvoke.CheckPermissions),

  openPermissionSettings: (kind: PermissionKind): Promise<void> =>
    ipcRenderer.invoke(IpcInvoke.OpenPermissionSettings, kind),

  startMonitoring: (): Promise<StartMonitoringResult> =>
    ipcRenderer.invoke(IpcInvoke.StartMonitoring),

  stopMonitoring: (): Promise<void> => ipcRenderer.invoke(IpcInvoke.StopMonitoring),

  toggleLunch: (): Promise<LunchState> => ipcRenderer.invoke(IpcInvoke.ToggleLunch),

  getMonitoringState: (): Promise<MonitoringState> =>
    ipcRenderer.invoke(IpcInvoke.GetMonitoringState),

  getTodaySummary: (date?: string): Promise<AppSummaryResult> =>
    ipcRenderer.invoke(IpcInvoke.GetTodaySummary, date),

  quitApp: (): Promise<void> => ipcRenderer.invoke(IpcInvoke.QuitApp),

  onMonitoringTick: (cb: (payload: MonitoringTickPayload) => void) => {
    const listener = (_: unknown, payload: MonitoringTickPayload) => cb(payload);
    ipcRenderer.on(IpcEvent.MonitoringTick, listener);
    return () => ipcRenderer.removeListener(IpcEvent.MonitoringTick, listener);
  },

  onMonitoringFlush: (cb: (payload: MonitoringFlushPayload) => void) => {
    const listener = (_: unknown, payload: MonitoringFlushPayload) => cb(payload);
    ipcRenderer.on(IpcEvent.MonitoringFlush, listener);
    return () => ipcRenderer.removeListener(IpcEvent.MonitoringFlush, listener);
  },

  onMonitoringSessionChanged: (cb: (payload: MonitoringSessionChangedPayload) => void) => {
    const listener = (_: unknown, payload: MonitoringSessionChangedPayload) => cb(payload);
    ipcRenderer.on(IpcEvent.MonitoringSessionChanged, listener);
    return () => ipcRenderer.removeListener(IpcEvent.MonitoringSessionChanged, listener);
  },

  onMonitoringPermissionWarning: (cb: (payload: { missing: PermissionKind }) => void) => {
    const listener = (_: unknown, payload: { missing: PermissionKind }) => cb(payload);
    ipcRenderer.on(IpcEvent.MonitoringPermissionWarning, listener);
    return () => ipcRenderer.removeListener(IpcEvent.MonitoringPermissionWarning, listener);
  },

  onAuthExpired: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on(IpcEvent.AuthExpired, listener);
    return () => ipcRenderer.removeListener(IpcEvent.AuthExpired, listener);
  },
};

contextBridge.exposeInMainWorld('hrms', hrms);
