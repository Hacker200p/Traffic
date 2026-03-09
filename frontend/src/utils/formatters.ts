import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { Severity, DensityLevel, SignalState, ViolationType } from '@/types';

/* ── Date / Time ──────────────────────────────────────────────────────────── */
export const formatDate = (iso: string) => format(parseISO(iso), 'MMM dd, yyyy');
export const formatDateTime = (iso: string) => format(parseISO(iso), 'MMM dd, yyyy HH:mm');
export const formatTime = (iso: string) => format(parseISO(iso), 'HH:mm:ss');
export const timeAgo = (iso: string) => formatDistanceToNow(parseISO(iso), { addSuffix: true });

/* ── Numbers ──────────────────────────────────────────────────────────────── */
export const formatNumber = (n: number) =>
  new Intl.NumberFormat('en-US').format(n);

export const formatPercent = (n: number, decimals = 1) =>
  `${(n * 100).toFixed(decimals)}%`;

export const formatSpeed = (kmh: number) => `${kmh.toFixed(0)} km/h`;

/* ── Labels ───────────────────────────────────────────────────────────────── */
export const severityLabel = (s: Severity) =>
  ({ low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' })[s];

export const densityLabel = (d: DensityLevel) =>
  ({ low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' })[d];

export const signalLabel = (s: SignalState) =>
  ({ red: 'Red', yellow: 'Yellow', green: 'Green', flashing: 'Flashing', off: 'Off' })[s];

export const violationLabel = (v: ViolationType) =>
  ({
    red_light: 'Red Light',
    speeding: 'Speeding',
    no_helmet: 'No Helmet',
    wrong_way: 'Wrong Way',
    illegal_parking: 'Illegal Parking',
  })[v];
