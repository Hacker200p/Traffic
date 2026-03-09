import { LS_ACCESS_TOKEN, LS_REFRESH_TOKEN, LS_USER } from './constants';
/* ── Local-storage helpers ────────────────────────────────────────────────── */
export function persistAuth(user, tokens) {
    localStorage.setItem(LS_ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(LS_REFRESH_TOKEN, tokens.refreshToken);
    localStorage.setItem(LS_USER, JSON.stringify(user));
}
export function loadAuthFromStorage() {
    try {
        const accessToken = localStorage.getItem(LS_ACCESS_TOKEN);
        const refreshToken = localStorage.getItem(LS_REFRESH_TOKEN);
        const raw = localStorage.getItem(LS_USER);
        if (!accessToken || !refreshToken || !raw)
            return { user: null, tokens: null };
        return { user: JSON.parse(raw), tokens: { accessToken, refreshToken } };
    }
    catch {
        clearAuth();
        return { user: null, tokens: null };
    }
}
export function clearAuth() {
    localStorage.removeItem(LS_ACCESS_TOKEN);
    localStorage.removeItem(LS_REFRESH_TOKEN);
    localStorage.removeItem(LS_USER);
}
/* ── Misc ─────────────────────────────────────────────────────────────────── */
export function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}
export function truncate(str, len = 40) {
    return str.length > len ? str.slice(0, len) + '…' : str;
}
export function debounce(fn, ms) {
    let timer;
    return ((...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    });
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
