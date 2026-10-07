import { useAppStore } from '@/store/useAppStore';
import type { AuthUser } from '@/services/auth/type';

const ACCESS_TOKEN_KEY = 'inventory_access_token';
const USER_KEY = 'inventory_user_data';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const tokenInStore = useAppStore.getState().accessToken;
  if (tokenInStore) return tokenInStore;
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(`${ACCESS_TOKEN_KEY}=`));
  return cookie ? decodeURIComponent(cookie.slice(ACCESS_TOKEN_KEY.length + 1)) : null;
}

export function saveSession(accessToken: string, user?: AuthUser | null): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_TOKEN_KEY}=${encodeURIComponent(accessToken)}; Path=/; Max-Age=604800; SameSite=Lax${secure}`;
  if (typeof window !== 'undefined' && user) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }
}

export function getSavedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  useAppStore.getState().clearSession();
  document.cookie = `${ACCESS_TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
  }
}

