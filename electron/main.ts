import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import os from 'os';
import { api, setOnAuthExpired } from './apiClient';
import { authStore } from './authStore';
import { checkPermissions, openPermissionSettings } from './permissions';
import { createTray, destroyTray } from './tray';
import * as monitoringSession from './monitoring/monitoringSession';
import {
  IpcEvent,
  IpcInvoke,
  type AuthUser,
  type LoginResult,
} from './ipcChannels';

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

const windowIconPath = app.isPackaged
  ? join(process.resourcesPath, 'App-logo.png')
  : join(app.getAppPath(), 'resources', 'App-logo.png');

function toAuthUser(rawUser: Record<string, unknown>): AuthUser {
  return {
    userId: rawUser.id as string,
    userName: rawUser.userName as string,
    firstName: rawUser.firstName as string,
    lastName: rawUser.lastName as string,
    email: rawUser.email as string,
    organizationId:
      ((rawUser.organization as { id?: string } | undefined)?.id as string) ||
      (rawUser.organizationId as string),
    mustChangePassword: !!rawUser.mustChangePassword,
  };
}

function extractErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { message?: string } } };
  return anyErr.response?.data?.message || 'Unable to reach the server. Please try again.';
}

// The users table's name is often left at its account-creation default; the
// employees table (HR profile, kept up to date via the Employees admin form)
// is the more accurate source when it exists. Best-effort — not every
// account (e.g. an admin-only login) has an employee record. Re-running this
// on every app launch (not just at login) means a name correction on the HR
// side is picked up automatically, without requiring the user to log out and
// back in.
async function refreshEmployeeName(token: string, user: AuthUser): Promise<AuthUser> {
  try {
    const { data: employee } = await api.get(`/employees/by-user/${user.userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (employee?.firstName && employee.firstName !== user.firstName) {
      const updated = { ...user, firstName: employee.firstName, lastName: employee.lastName || '' };
      authStore.setAuth(token, updated);
      return updated;
    }
  } catch {
    // no employee HR record for this account, or request failed — keep current name
  }
  return user;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 640,
    title: 'Avinya HRMS Monitor',
    icon: windowIconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Minimize to tray instead of quitting when the user clicks the close button.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  monitoringSession.setEmitter((channel, payload) => {
    mainWindow?.webContents.send(channel, payload);
  });

  setOnAuthExpired(() => {
    void monitoringSession.stop();
    mainWindow?.webContents.send(IpcEvent.AuthExpired);
  });

  createTray(() => mainWindow);
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    IpcInvoke.Login,
    async (_event, userName: string, password: string): Promise<LoginResult> => {
      try {
        const { data } = await api.post('/auth/login', {
          userName,
          password,
          clientInfo: {
            device: `${os.hostname()} (${process.platform})`,
            appVersion: app.getVersion(),
          },
        });
        const user = toAuthUser(data.user);
        authStore.setAuth(data.access_token, user);
        const refreshedUser = await refreshEmployeeName(data.access_token, user);

        return { ok: true, user: refreshedUser };
      } catch (err) {
        return { ok: false, error: extractErrorMessage(err) };
      }
    },
  );

  ipcMain.handle(IpcInvoke.Logout, async () => {
    await monitoringSession.stop();
    authStore.clearAuth();
    return { ok: true };
  });

  ipcMain.handle(IpcInvoke.GetAuthState, async () => {
    const isAuthenticated = authStore.isAuthenticated();
    let user = authStore.getUser();
    const token = authStore.getToken();
    if (isAuthenticated && user && token) {
      user = await refreshEmployeeName(token, user);
    }
    return { isAuthenticated, user };
  });

  ipcMain.handle(IpcInvoke.GetTermsText, async () => {
    const { data } = await api.get('/wfh-monitoring/terms-text');
    return data;
  });

  ipcMain.handle(IpcInvoke.GetTermsStatus, async () => {
    const { data } = await api.get('/wfh-monitoring/terms-acceptance/status');
    return data;
  });

  ipcMain.handle(IpcInvoke.AcceptTerms, async (_event, tacVersion: string) => {
    const { data } = await api.post('/wfh-monitoring/terms-acceptance', { tacVersion });
    return data;
  });

  ipcMain.handle(IpcInvoke.CheckPermissions, () => checkPermissions());

  ipcMain.handle(IpcInvoke.OpenPermissionSettings, async (_event, kind) => {
    await openPermissionSettings(kind);
  });

  ipcMain.handle(IpcInvoke.StartMonitoring, () => monitoringSession.start());

  ipcMain.handle(IpcInvoke.StopMonitoring, async () => {
    await monitoringSession.stop();
  });

  ipcMain.handle(IpcInvoke.ToggleLunch, async () => {
    try {
      const { data } = await api.post('/wfh-monitoring/lunch/toggle');
      return data;
    } catch {
      const { data: today } = await api.get('/wfh-monitoring/today');
      return {
        isLunch: today.isLunch ?? false,
        lunchStart: today.lunchStart ?? null,
        lunchEnd: today.lunchEnd ?? null,
      };
    }
  });

  ipcMain.handle(IpcInvoke.GetMonitoringState, () => monitoringSession.getState());

  ipcMain.handle(IpcInvoke.GetTodaySummary, async (_event, date?: string) => {
    try {
      const params: Record<string, string> = {};
      if (date) params.date = date;
      const { data } = await api.get('/wfh-monitoring/app-summary', { params });
      return data;
    } catch {
      return null;
    }
  });

  ipcMain.handle(IpcInvoke.GetTodayMonitoring, async () => {
    try {
      const { data } = await api.get('/wfh-monitoring/today');
      return {
        hasApprovedWfh: Boolean(data?.hasApprovedWfh),
        isWorking: Boolean(data?.isWorking),
      };
    } catch {
      return null;
    }
  });

  ipcMain.handle(IpcInvoke.QuitApp, () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  // Dev mode runs inside the generic "Electron" bundle; stamp the Dock icon
  // manually so the logo shows even before the app is packaged with a real icon.
  if (process.platform === 'darwin') {
    app.dock?.setIcon(windowIconPath);
  }

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('before-quit', async (event) => {
  if (isQuitting) return;
  event.preventDefault();
  isQuitting = true;
  await monitoringSession.quitFlush();
  destroyTray();
  app.quit();
});

// No 'window-all-closed' handler: the tray keeps the app running even when
// the window is hidden/closed on any platform (minimize-to-tray behavior).
