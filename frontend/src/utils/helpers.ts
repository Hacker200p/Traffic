import { LS_ACCESS_TOKEN, LS_REFRESH_TOKEN, LS_USER } from './constants';
import type { AuthTokens, User } from '@/types';

/* ── Local-storage helpers ────────────────────────────────────────────────── */
export function persistAuth(user: User, tokens: AuthTokens): void {
  localStorage.setItem(LS_ACCESS_TOKEN, tokens.accessToken);
  localStorage.setItem(LS_REFRESH_TOKEN, tokens.refreshToken);
  localStorage.setItem(LS_USER, JSON.stringify(user));
}

export function loadAuthFromStorage(): { user: User | null; tokens: AuthTokens | null } {
  try {
    const accessToken = localStorage.getItem(LS_ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(LS_REFRESH_TOKEN);
    const raw = localStorage.getItem(LS_USER);
    if (!accessToken || !refreshToken || !raw) return { user: null, tokens: null };
    return { user: JSON.parse(raw), tokens: { accessToken, refreshToken } };
  } catch {
    clearAuth();
    return { user: null, tokens: null };
  }
}

export function clearAuth(): void {
  localStorage.removeItem(LS_ACCESS_TOKEN);
  localStorage.removeItem(LS_REFRESH_TOKEN);
  localStorage.removeItem(LS_USER);
}

/* ── Misc ─────────────────────────────────────────────────────────────────── */
export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, len = 40): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
