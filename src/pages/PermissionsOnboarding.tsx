import * as api from '../services/api';
import type { PermissionsState } from '../../electron/ipcChannels';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

interface Props {
  permissions: PermissionsState;
  onRefresh: () => Promise<void>;
  onContinue: () => void;
}

function PermissionRow({
  label,
  granted,
  onOpenSettings,
}: {
  label: string;
  granted: boolean;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn('h-2 w-2 rounded-full', granted ? 'bg-chart-2' : 'bg-muted-foreground')}
          />
          <span className="text-sm">{label}</span>
        </div>
        <Badge variant={granted ? 'default' : 'outline'}>{granted ? 'Granted' : 'Not granted'}</Badge>
      </div>
      {!granted && (
        <Button variant="secondary" size="sm" onClick={onOpenSettings}>
          Open Settings
        </Button>
      )}
    </div>
  );
}

export default function PermissionsOnboarding({ permissions, onRefresh, onContinue }: Props) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Grant macOS Permissions</CardTitle>
        <CardDescription>
          Two permissions are needed for full tracking. Without them the app still runs, but the
          related data stays at zero.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <PermissionRow
            label="Accessibility (keystroke/click counts)"
            granted={permissions.accessibilityGranted}
            onOpenSettings={() => api.openPermissionSettings('accessibility')}
          />
          <PermissionRow
            label="Screen Recording (active app/window name)"
            granted={permissions.screenRecordingGranted}
            onOpenSettings={() => api.openPermissionSettings('screenRecording')}
          />
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Running via <code className="bg-muted rounded px-1">npm run dev</code>? macOS prompts
          for the generic "Electron" app, not "Avinya HRMS Monitor" — look for "Electron" in the
          list, or click "+" and add it manually from{' '}
          <code className="bg-muted rounded px-1">node_modules/electron/dist/Electron.app</code>.
          A packaged build (<code className="bg-muted rounded px-1">npm run make</code>) prompts
          under the app's real name instead.
        </p>

        <Button onClick={onRefresh}>I've Granted It — Check Again</Button>
        <Button variant="secondary" className="w-full" onClick={onContinue}>
          Continue Without It
        </Button>
      </CardContent>
    </Card>
  );
}
