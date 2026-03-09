/* ── Application-wide constants ────────────────────────────────────────────── */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';
export const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Traffic Control System';

// Default map center (override per deployment)
export const MAP_DEFAULT_CENTER: [number, number] = [31.2357, 30.0444]; // Cairo
export const MAP_DEFAULT_ZOOM = 13;

// Refresh intervals (ms)
export const REFRESH_INTERVAL_LIVE = 5_000;
export const REFRESH_INTERVAL_ANALYTICS = 30_000;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Density-level colours (Tailwind-compatible)
export const DENSITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

// Signal-state colours
export const SIGNAL_COLORS: Record<string, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  flashing: '#f59e0b',
  off: '#6b7280',
};

// Violation-severity colours
export const SEVERITY_COLORS: Record<string, string> = {
  low: '#3b82f6',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

// Vehicle-type icons (heroicon paths)
export const VEHICLE_ICONS: Record<string, string> = {
  car: '🚗',
  motorcycle: '🏍️',
  bus: '🚌',
  truck: '🚛',
  bicycle: '🚲',
  unknown: '🚙',
};

// Local storage keys
export const LS_ACCESS_TOKEN = 'traffic_access_token';
export const LS_REFRESH_TOKEN = 'traffic_refresh_token';
export const LS_USER = 'traffic_user';
