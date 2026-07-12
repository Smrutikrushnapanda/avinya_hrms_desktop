import { useEffect, useState } from 'react';
import Sidebar, { type NavKey } from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Dashboard from './Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useMonitorStore } from '../stores/monitorStore';

const PAGE_META: Record<NavKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Real-time overview of your work activity' },
  activity: { title: 'Activity', subtitle: 'Detailed activity log' },
  reports: { title: 'Reports', subtitle: 'Exportable activity reports' },
  settings: { title: 'Settings', subtitle: 'App preferences' },
  help: { title: 'Help & Support', subtitle: 'Get help with Avinya HRMS Monitor' },
  about: { title: 'About', subtitle: 'Avinya HRMS Monitor' },
};

export default function MainApp() {
  const [active, setActive] = useState<NavKey>('dashboard');
  const init = useMonitorStore((s) => s.init);
  const meta = PAGE_META[active];

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar active={active} onNavigate={setActive} />
      <div className="flex-1 overflow-y-auto">
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <div className="px-8 pb-8">
          {active === 'dashboard' ? (
            <Dashboard />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coming soon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {meta.title} isn't built yet in this version of the desktop app.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
