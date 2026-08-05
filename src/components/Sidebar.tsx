import { useState } from 'react';
import {
  Activity,
  ChevronDown,
  FileText,
  HelpCircle,
  Info,
  LayoutDashboard,
  LogOut,
  Settings,
  Utensils,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useMonitorStore } from '../stores/monitorStore';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export type NavKey = 'dashboard' | 'activity' | 'reports' | 'settings' | 'help' | 'about';

const NAV_ITEMS: Array<{ key: NavKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'help', label: 'Help & Support', icon: HelpCircle },
  { key: 'about', label: 'About', icon: Info },
];

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface Props {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
}

export default function Sidebar({ active, onNavigate }: Props) {
  const { user, logout } = useAuthStore();
  const monitor = useMonitorStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const sessionElapsedSeconds =
    monitor.isMonitoring && monitor.sessionStart
      ? Math.max(0, Math.floor((Date.now() - new Date(monitor.sessionStart).getTime()) / 1000))
      : 0;

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <aside className="bg-card flex h-full w-64 shrink-0 flex-col border-r">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img
          src="/App-logo.png"
          alt="Avinya HRMS logo"
          className="size-9 flex-shrink-0 rounded-lg object-contain"
        />
        <div>
          <div className="text-sm leading-none font-semibold">Avinya</div>
          <div className="text-muted-foreground text-xs">WFH Monitor</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
              active === key
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t p-4">
        <div className="bg-secondary/50 flex flex-col gap-2 rounded-lg border p-3">
          <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            Monitoring Status
          </span>
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
                ? 'Active'
                : 'Inactive'}
          </div>
          {monitor.isMonitoring && monitor.sessionStart && (
            <span className="text-muted-foreground text-xs">
              Since {formatTime(monitor.sessionStart)}
            </span>
          )}
          {monitor.isMonitoring ? (
            <>
              <Button variant="destructive" size="sm" onClick={() => monitor.stop()}>
                Stop Monitoring
              </Button>
              {!monitor.lunchEnd && (
                <Button
                  variant={monitor.isLunch ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => monitor.toggleLunch()}
                >
                  <Utensils className="mr-1.5 size-3.5" />
                  {monitor.isLunch ? 'End Meal Break' : 'Meal Break'}
                </Button>
              )}
              {monitor.lunchEnd && !monitor.isLunch && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                >
                  <Utensils className="mr-1.5 size-3.5" />
                  Meal Break Completed
                </Button>
              )}
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>Session Duration</span>
                <span className="text-foreground font-medium">
                  {formatDuration(sessionElapsedSeconds)}
                </span>
              </div>
            </>
          ) : (
            <Button size="sm" onClick={() => monitor.start()} disabled={monitor.starting}>
              {monitor.starting ? 'Starting…' : 'Start Monitoring'}
            </Button>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="hover:bg-accent flex w-full items-center gap-2.5 rounded-lg p-2 text-left"
          >
            <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {initials || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm leading-none font-medium">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-muted-foreground truncate text-xs">{user?.email}</div>
            </div>
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          </button>
          {profileOpen && (
            <div className="bg-popover absolute bottom-full left-0 mb-1 w-full rounded-lg border p-1 shadow-md">
              <button
                onClick={() => logout()}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm"
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
