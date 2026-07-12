import { app, Menu, nativeImage, Tray, type BrowserWindow } from 'electron';
import * as monitoringSession from './monitoring/monitoringSession';

// 16x16 transparent-background placeholder dot — swap for resources/tray-icon.png
// (see resources/README) before shipping a real build.
const PLACEHOLDER_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOUlEQVR4Ae3OMQEAAAgDoJnc6FrCHhQwuAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABPGgWlAAGw3XSDAAAAAElFTkSuQmCC';

let tray: Tray | null = null;

export function createTray(getWindow: () => BrowserWindow | null): void {
  if (tray) return;

  const icon = nativeImage.createFromDataURL(PLACEHOLDER_ICON_DATA_URL);
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
