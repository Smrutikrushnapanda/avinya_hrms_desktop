import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import * as api from './services/api';
import type { PermissionsState } from '../electron/ipcChannels';
import Login from './pages/Login';
import Terms from './pages/Terms';
import PermissionsOnboarding from './pages/PermissionsOnboarding';
import MainApp from './pages/MainApp';

type Screen = 'loading' | 'login' | 'terms' | 'permissions' | 'dashboard';

export default function App() {
  const { isAuthenticated, loading, initializeAuth } = useAuthStore();
  const [termsUpToDate, setTermsUpToDate] = useState<boolean | null>(null);
  const [permissions, setPermissions] = useState<PermissionsState | null>(null);
  const [permissionsDismissed, setPermissionsDismissed] = useState(false);

  useEffect(() => {
    void initializeAuth();

    const unsubExpired = api.onAuthExpired(() => {
      setTermsUpToDate(null);
      setPermissions(null);
      setPermissionsDismissed(false);
    });
    return unsubExpired;
  }, [initializeAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      const [status, perms] = await Promise.all([
        api.getTermsStatus(),
        api.checkPermissions(),
      ]);
      setTermsUpToDate(status.upToDate);
      setPermissions(perms);
    })();
  }, [isAuthenticated]);

  let screen: Screen = 'loading';
  if (!loading) {
    if (!isAuthenticated) {
      screen = 'login';
    } else if (termsUpToDate === null || permissions === null) {
      screen = 'loading';
    } else if (!termsUpToDate) {
      screen = 'terms';
    } else if (
      (!permissions.accessibilityGranted || !permissions.screenRecordingGranted) &&
      !permissionsDismissed
    ) {
      screen = 'permissions';
    } else {
      screen = 'dashboard';
    }
  }

  if (screen === 'dashboard') {
    return <MainApp />;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center p-7">
      {screen === 'loading' && <p className="text-muted-foreground text-sm">Loading…</p>}
      {screen === 'login' && <Login />}
      {screen === 'terms' && <Terms onAccepted={() => setTermsUpToDate(true)} />}
      {screen === 'permissions' && (
        <PermissionsOnboarding
          permissions={permissions!}
          onRefresh={async () => setPermissions(await api.checkPermissions())}
          onContinue={() => setPermissionsDismissed(true)}
        />
      )}
    </div>
  );
}
