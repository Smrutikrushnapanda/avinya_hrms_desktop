import Store from 'electron-store';
import type { AuthUser } from './ipcChannels';

interface AuthStoreSchema {
  token?: string;
  user?: AuthUser;
}

const store = new Store<AuthStoreSchema>({ name: 'hrms-auth' });

export const authStore = {
  getToken(): string | null {
    return store.get('token') ?? null;
  },

  getUser(): AuthUser | null {
    return store.get('user') ?? null;
  },

  isAuthenticated(): boolean {
    return !!store.get('token');
  },

  setAuth(token: string, user: AuthUser): void {
    store.set('token', token);
    store.set('user', user);
  },

  clearAuth(): void {
    store.delete('token');
    store.delete('user');
  },
};
