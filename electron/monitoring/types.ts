// Matches the backend's AppActivityEntryDto (hrms-app-backend/src/modules/wfh-monitoring/dto/log-app-activity.dto.ts)
export interface AppActivityEntry {
  appName: string;
  windowTitle?: string;
  keystrokeCount: number;
  mouseClicks: number;
  durationSeconds: number;
  occurredAt: string;
  date: string;
}
