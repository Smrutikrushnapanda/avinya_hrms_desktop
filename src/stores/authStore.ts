import { create } from 'zustand';
import * as api from '../services/api';
import type { AuthUser } from '../../electron/ipcChannels';

interface AuthStoreState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  initializeAuth: () => Promise<void>;
  login: (userName: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,

  initializeAuth: async () => {
    const state = await api.getAuthState();
    set({ isAuthenticated: state.isAuthenticated, user: state.user, loading: false });
  },

  login: async (userName, password) => {
    set({ loading: true, error: null });
    const result = await api.login(userName, password);
    if (result.ok && result.user) {
      set({ isAuthenticated: true, user: result.user, loading: false, error: null });
      return true;
    }
    set({ loading: false, error: result.error || 'Login failed' });
    return false;
  },

  logout: async () => {
    await api.logout();
    set({ isAuthenticated: false, user: null });
  },
}));
