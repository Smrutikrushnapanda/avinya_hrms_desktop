import { app, Menu, nativeImage, Tray, type BrowserWindow } from 'electron';
import { join } from 'path';
import * as monitoringSession from './monitoring/monitoringSession';

// 16x16 transparent-background placeholder dot — used only if the real logo
// (resources/App-logo.png) cannot be loaded.
const PLACEHOLDER_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOUlEQVR4Ae3OMQEAAAgDoJnc6FrCHhQwuAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABPGgWlAAGw3XSDAAAAAElFTkSuQmCC';

// resources/ is inside the app dir in dev; in a packaged build electron-builder
// ships it as an extraResource into the Resources directory.
const ICON_PATH = app.isPackaged
  ? join(process.resourcesPath, 'App-logo.png')
  : join(app.getAppPath(), 'resources', 'App-logo.png');

function loadTrayIcon(): Electron.NativeImage {
  let icon = nativeImage.createFromPath(ICON_PATH);
  if (icon.isEmpty()) {
    icon = nativeImage.createFromDataURL(PLACEHOLDER_ICON_DATA_URL);
  }
  return icon.resize({ width: 16, height: 16 });
}

let tray: Tray | null = null;

export function createTray(getWindow: () => BrowserWindow | null): void {
  if (tray) return;

  const icon = loadTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Avinya HRMS Monitor');

  const rebuildMenu = () => {
    const monitoring = monitoringSession.isMonitoring();
    const menu = Menu.buildFromTemplate([
      {
        label: 'Open Dashboard',
        click: () => {
          const win = getWindow();
          win?.show();
          win?.focus();
        },
      },
      { type: 'separator' },
      {
        label: monitoring ? 'Stop Monitoring' : 'Start Monitoring',
        click: async () => {
          if (monitoring) {
            await monitoringSession.stop();
          } else {
            await monitoringSession.start();
          }
          rebuildMenu();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);
    tray?.setContextMenu(menu);
  };

  rebuildMenu();

  tray.on('click', () => {
    const win = getWindow();
    win?.show();
    win?.focus();
  });
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
