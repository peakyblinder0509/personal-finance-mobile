import axios from 'axios';
import Constants from 'expo-constants';

import { getToken } from '@/src/services/authStorage';

const API_PORT = 8090;

function resolveDevBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:${API_PORT}` : `http://10.251.213.110:${API_PORT}`;
}

const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE_URL =
  ENV_BASE_URL && ENV_BASE_URL.length > 0
    ? ENV_BASE_URL
    : __DEV__
      ? resolveDevBaseUrl()
      : 'http://10.251.213.110:8090';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/api/auth/') ?? false;
    if (axios.isAxiosError(error) && error.response?.status === 403 && !isAuthEndpoint) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export async function checkHealth(): Promise<boolean> {
  try {
    await api.get('/api/health', { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Cannot reach the server. Check your connection.';
    }
    const data = error.response.data;
    if (typeof data === 'object' && data !== null && 'message' in data) {
      return String((data as { message: unknown }).message);
    }
    return fallback;
  }
  return fallback;
}
