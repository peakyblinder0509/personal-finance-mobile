import axios from 'axios';
import Constants from 'expo-constants';

import { getToken } from '@/src/services/authStorage';

// Central API configuration.
//
// CLAUDE.md rules enforced here:
//   - "All API calls go through services/ layer"
//   - "Never call axios directly from screens"
// This shared client is the ONLY thing that talks to the network. Screens call
// hooks/context, which call services, which use this client.

const API_PORT = 8080;

// In dev, "localhost" is relative to wherever the app runs (the phone, the
// Android emulator VM, ...), NOT your Mac — so a physical device or emulator
// can't reach the Spring Boot server that way. Metro already serves the JS
// bundle from your Mac's reachable address, exposed as `hostUri`
// (e.g. "192.168.1.50:8081"); we reuse that host and just swap the port.
function resolveDevBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri; // "<host>:<metroPort>"
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:${API_PORT}` : `http://localhost:${API_PORT}`;
}

// Resolution order:
//   1. EXPO_PUBLIC_API_URL from .env (explicit override — used for prod or to
//      point at a deployed/staging API). Expo inlines EXPO_PUBLIC_* at build time.
//   2. Dev: auto-detected LAN host so a physical device just works.
//   3. Prod fallback if no env var was set.
const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE_URL =
  ENV_BASE_URL && ENV_BASE_URL.length > 0
    ? ENV_BASE_URL
    : __DEV__
      ? resolveDevBaseUrl()
      : 'https://your-aws-url.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // fail fast instead of hanging forever if the server is down
});

// Attach the JWT to every outgoing request automatically, so individual
// services never have to think about auth headers.
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── 401 handling ──────────────────────────────────────────────────────────
// A 401 on a protected request means the token is missing/expired/invalid.
// We want to clear the session and bounce the user to login. But this module is
// framework-agnostic (no React, no navigation), so instead of importing the
// auth context here, AuthContext REGISTERS a handler via setUnauthorizedHandler.
// That keeps the dependency arrow pointing the right way (context -> api).
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't fire on the login/register calls themselves (they legitimately
    // return auth errors); only on already-authenticated requests.
    const isAuthEndpoint = error.config?.url?.includes('/api/auth/') ?? false;
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isAuthEndpoint) {
      onUnauthorized?.(); // clears the session -> nav gate falls back to login
    }
    return Promise.reject(error);
  },
);

// Extract a user-facing message from a failed request. The API returns errors as
// { status, message, timestamp }, so we surface `message` (e.g. the 409 "budget
// already exists" or a 400 validation message) instead of axios's generic
// "Request failed with status code 409".
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
