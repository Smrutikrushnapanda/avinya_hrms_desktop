import axios, { AxiosInstance } from 'axios';
import { authStore } from './authStore';

const DEFAULT_API_BASE_URL = 'https://avinyahrms.duckdns.org';

// electron-vite statically replaces import.meta.env.VITE_* at build time
// (same as Vite for the renderer) — it does NOT populate process.env at
// runtime, so process.env.VITE_API_BASE_URL would always be undefined here.
const apiBaseURL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export const api: AxiosInstance = axios.create({
  baseURL: apiBaseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onAuthExpired: (() => void) | null = null;

export function setOnAuthExpired(handler: () => void): void {
  onAuthExpired = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = (error.config?.url || '').includes('/auth/');
      if (!isAuthRoute && authStore.isAuthenticated()) {
        authStore.clearAuth();
        onAuthExpired?.();
      }
    }
    return Promise.reject(error);
  },
);
