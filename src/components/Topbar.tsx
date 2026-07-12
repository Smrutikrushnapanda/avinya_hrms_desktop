import { RefreshCw, Utensils } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useMonitorStore } from '../stores/monitorStore';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface Props {
  title: string;
  subtitle: string;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

export default function Topbar({ title, subtitle }: Props) {
  const { user } = useAuthStore();
  const monitor = useMonitorStore();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex items-center justify-between px-8 pt-7 pb-5">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant={monitor.isMonitoring ? 'default' : 'outline'}
          className={cn('gap-1.5', monitor.isMonitoring && !monitor.isLunch ? 'bg-chart-2 text-white' : '', monitor.isLunch && 'bg-chart-5 text-white')}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {monitor.isMonitoring && monitor.isLunch
            ? 'On Meal Break'
            : monitor.isMonitoring
              ? 'Monitoring Active'
              : 'Not Monitoring'}
        </Badge>
        {monitor.isLunch && (
          <Badge variant="outline" className="gap-1.5 border-chart-5 text-chart-5">
            <Utensils className="size-3" />
            Meal Break
          </Badge>
        )}
        {monitor.lunchEnd && !monitor.isLunch && (
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <Utensils className="size-3" />
            Meal Break Completed
          </Badge>
        )}
        {monitor.lastFlushAt && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <RefreshCw className="size-3.5" />
            Last sync: {formatClock(monitor.lastFlushAt)}
          </div>
        )}
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full text-xs font-semibold">
          {initials || '?'}
        </div>
      </div>
    </div>
  );
}
