import type { HrmsBridge } from '../electron/ipcChannels';

declare global {
  interface Window {
    hrms: HrmsBridge;
  }
}

export {};
