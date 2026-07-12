import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Clock, Coffee, Keyboard, Mouse, TrendingUp, Utensils } from 'lucide-react';
import { useMonitorStore } from '../stores/monitorStore';
import * as api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import GoalRing from '../components/GoalRing';
import { categorizeApp } from '../lib/appCategory';
import { cn } from '../lib/utils';

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

const DAILY_GOAL_SECONDS = 8 * 3600; // no admin-configurable goal exists yet; 8h is a fixed default

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

function pctChange(today: number, yesterday: number): number | null {
  if (yesterday === 0) return null;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <span className={cn('text-xs font-medium', positive ? 'text-chart-2' : 'text-destructive')}>
      {positive ? '↑' : '↓'} {Math.abs(value)}% <span className="text-muted-foreground">vs yesterday</span>
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="flex items-center gap-2">
          <div className="bg-secondary flex size-8 items-center justify-center rounded-lg">
            <Icon className="text-primary size-4" />
          </div>
          <span className="text-muted-foreground text-xs">{label}</span>
        </div>
        <span className="text-xl font-bold">{value}</span>
        {delta !== undefined && <DeltaBadge value={delta} />}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const monitor = useMonitorStore();

  const totalActiveSeconds = monitor.todaySummary?.totals.durationSeconds ?? 0;
  const totalKeystrokes = monitor.todaySummary?.totals.keystrokes ?? 0;
  const totalClicks = monitor.todaySummary?.totals.clicks ?? 0;
  const apps = monitor.todaySummary?.apps ?? [];

  const yesterdayActive = monitor.yesterdaySummary?.totals.durationSeconds ?? 0;
  const yesterdayKeystrokes = monitor.yesterdaySummary?.totals.keystrokes ?? 0;
  const yesterdayClicks = monitor.yesterdaySummary?.totals.clicks ?? 0;

  const sessionElapsedSeconds =
    monitor.isMonitoring && monitor.sessionStart
      ? Math.max(0, Math.floor((Date.now() - new Date(monitor.sessionStart).getTime()) / 1000))
      : 0;

  const totalTimeSeconds = Math.max(sessionElapsedSeconds, totalActiveSeconds);
  const idleSecondsToday = Math.max(0, totalTimeSeconds - totalActiveSeconds);

  const productivityScore =
    sessionElapsedSeconds > 0
      ? Math.round(Math.min(100, (totalActiveSeconds / sessionElapsedSeconds) * 100))
      : null;

  const goalPercent = Math.round(Math.min(100, (totalActiveSeconds / DAILY_GOAL_SECONDS) * 100));

  const timelineData = monitor.activityBuffer.map((v, i) => ({ i, v }));

  return (
    <div className="flex flex-col gap-5">
      {monitor.screenRecordingWarning && (
        <div className="border-destructive/40 bg-destructive/10 flex items-center justify-between gap-3 rounded-lg border p-3 text-xs leading-relaxed">
          <span className="text-destructive">
            <strong>Screen Recording permission isn't granted</strong> — the active app can't be
            detected, so "Top Applications Today" is showing "Unknown" instead of real app names.
            Grant it, then restart monitoring.
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="shrink-0"
            onClick={() => api.openPermissionSettings('screenRecording')}
          >
            Open Settings
          </Button>
        </div>
      )}
      {monitor.accessibilityWarning && (
        <div className="border-chart-3/40 bg-chart-3/10 text-chart-3 flex items-center justify-between gap-3 rounded-lg border p-3 text-xs leading-relaxed">
          <span>
            Accessibility access isn't granted, so keystroke/click counts are staying at 0. App
            and duration tracking still works normally.
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={() => api.openPermissionSettings('accessibility')}
          >
            Open Settings
          </Button>
        </div>
      )}

      {monitor.isLunch && (
        <div className="border-chart-5/40 bg-chart-5/10 text-chart-5 flex items-center justify-between gap-3 rounded-lg border p-3 text-xs leading-relaxed">
          <span className="flex items-center gap-2">
            <Utensils className="size-4" />
            <strong>On Meal Break</strong> — monitoring is paused until you end your break.
          </span>
          <Button size="sm" variant="secondary" className="shrink-0" onClick={() => monitor.toggleLunch()}>
            End Meal Break
          </Button>
        </div>
      )}

      {monitor.lunchEnd && !monitor.isLunch && (
        <div className="border-chart-5/30 bg-chart-5/5 flex items-center gap-3 rounded-lg border p-3 text-xs leading-relaxed">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Utensils className="size-4" />
            <strong>Meal Break Completed</strong> — you have already taken your break today.
          </span>
        </div>
      )}

      {/* Monitoring Controls / Session Info / Today's Goal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monitoring Controls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <span
                className={cn(
                  'size-2 rounded-full',
                  monitor.isMonitoring && !monitor.isLunch ? 'bg-chart-2' : 'bg-chart-5',
                  !monitor.isMonitoring && 'bg-muted-foreground',
                )}
              />
              {monitor.isMonitoring && monitor.isLunch
                ? 'On Meal Break'
                : monitor.isMonitoring
                  ? 'Monitoring Active'
                  : 'Monitoring Paused'}
            </div>
            {monitor.startError && <p className="text-destructive text-xs">{monitor.startError}</p>}
            {monitor.isMonitoring ? (
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={() => monitor.stop()}>
                  Stop Monitoring
                </Button>
                {!monitor.lunchEnd && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => monitor.toggleLunch()}
                    disabled={!monitor.isMonitoring}
                  >
                    <Utensils className="mr-1.5 size-4" />
                    {monitor.isLunch ? 'End Meal Break' : 'Meal Break'}
                  </Button>
                )}
                {monitor.lunchEnd && !monitor.isLunch && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled
                  >
                    <Utensils className="mr-1.5 size-4" />
                    Meal Break Completed
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={() => monitor.start()} disabled={monitor.starting}>
                {monitor.starting ? 'Starting…' : 'Start Monitoring'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Info</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Started At</div>
              <div className="font-medium">
                {monitor.isMonitoring && monitor.sessionStart
                  ? formatDateTime(monitor.sessionStart)
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Duration</div>
              <div className="font-medium">
                {monitor.isMonitoring ? formatDuration(sessionElapsedSeconds) : '—'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Goal</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <GoalRing percent={goalPercent} size={88} strokeWidth={8} />
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">Active Hours Goal</span>
              <span className="text-sm font-medium">
                {formatDuration(totalActiveSeconds)} / {formatDuration(DAILY_GOAL_SECONDS)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          icon={Clock}
          label="Active Hours"
          value={formatDuration(totalActiveSeconds)}
          delta={pctChange(totalActiveSeconds, yesterdayActive)}
        />
        <StatCard icon={Coffee} label="Idle Time" value={formatDuration(idleSecondsToday)} />
        <StatCard
          icon={Keyboard}
          label="Keystrokes"
          value={String(totalKeystrokes)}
          delta={pctChange(totalKeystrokes, yesterdayKeystrokes)}
        />
        <StatCard
          icon={Mouse}
          label="Mouse Clicks"
          value={String(totalClicks)}
          delta={pctChange(totalClicks, yesterdayClicks)}
        />
        <StatCard
          icon={TrendingUp}
          label="Productivity Score"
          value={productivityScore !== null ? `${productivityScore}/100` : '—'}
        />
      </div>

      {/* Current activity + Top apps */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Current Activity (Live)</CardTitle>
            {monitor.isMonitoring && (
              <Badge className="bg-chart-2 gap-1.5 text-white">
                <span className="size-1.5 rounded-full bg-current" />
                Live
              </Badge>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {monitor.isMonitoring && monitor.currentApp ? (
              <>
                <div className="bg-secondary/50 flex items-center gap-3 rounded-lg border p-3">
                  <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
                    {monitor.currentApp[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{monitor.currentApp}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {monitor.currentAppWindowTitle || '—'}
                    </div>
                  </div>
                  <Badge variant="outline">{categorizeApp(monitor.currentApp).toUpperCase()}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold">{monitor.keystrokesSinceFlush}</div>
                    <div className="text-muted-foreground text-[11px]">Keystrokes (1m)</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{monitor.clicksSinceFlush}</div>
                    <div className="text-muted-foreground text-[11px]">Mouse Clicks (1m)</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {formatDuration(monitor.currentAppDurationSec)}
                    </div>
                    <div className="text-muted-foreground text-[11px]">Active For</div>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1 text-xs">Activity Timeline (Live)</div>
                  <div className="h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData}>
                        <defs>
                          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke="var(--color-chart-2)"
                          strokeWidth={2}
                          fill="url(#activityFill)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Start monitoring to see your live activity.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Applications Today</CardTitle>
          </CardHeader>
          <CardContent>
            {apps.length > 0 ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={apps}
                        dataKey="durationSeconds"
                        nameKey="appName"
                        innerRadius={38}
                        outerRadius={68}
                        paddingAngle={2}
                      >
                        {apps.map((app, i) => (
                          <Cell key={app.appName} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatDuration(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full flex-1 text-sm">
                  <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-x-3 pb-1.5 text-xs">
                    <span>Application</span>
                    <span>Time</span>
                    <span>%</span>
                  </div>
                  {apps.map((app, i) => (
                    <div
                      key={app.appName}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-b py-1.5 last:border-b-0"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        {app.appName}
                      </span>
                      <span>{formatDuration(app.durationSeconds)}</span>
                      <span className="text-muted-foreground">
                        {totalActiveSeconds > 0
                          ? Math.round((app.durationSeconds / totalActiveSeconds) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No activity recorded yet today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today's Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between border-b pb-2 text-sm sm:border-b-0 sm:pb-0">
              <span className="text-muted-foreground">Total Time</span>
              <span className="font-medium">{formatDuration(totalTimeSeconds)}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2 text-sm sm:border-b-0 sm:pb-0">
              <span className="text-muted-foreground">Active Time</span>
              <span className="font-medium">{formatDuration(totalActiveSeconds)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Idle Time</span>
              <span className="font-medium">{formatDuration(idleSecondsToday)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
