import { format, formatDistanceToNow, parseISO } from 'date-fns';
/* ── Date / Time ──────────────────────────────────────────────────────────── */
export const formatDate = (iso) => format(parseISO(iso), 'MMM dd, yyyy');
export const formatDateTime = (iso) => format(parseISO(iso), 'MMM dd, yyyy HH:mm');
export const formatTime = (iso) => format(parseISO(iso), 'HH:mm:ss');
export const timeAgo = (iso) => formatDistanceToNow(parseISO(iso), { addSuffix: true });
/* ── Numbers ──────────────────────────────────────────────────────────────── */
export const formatNumber = (n) => new Intl.NumberFormat('en-US').format(n);
export const formatPercent = (n, decimals = 1) => `${(n * 100).toFixed(decimals)}%`;
export const formatSpeed = (kmh) => `${kmh.toFixed(0)} km/h`;
/* ── Labels ───────────────────────────────────────────────────────────────── */
export const severityLabel = (s) => ({ low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' })[s];
export const densityLabel = (d) => ({ low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' })[d];
export const signalLabel = (s) => ({ red: 'Red', yellow: 'Yellow', green: 'Green', flashing: 'Flashing', off: 'Off' })[s];
export const violationLabel = (v) => ({
    red_light: 'Red Light',
    speeding: 'Speeding',
    no_helmet: 'No Helmet',
    wrong_way: 'Wrong Way',
    illegal_parking: 'Illegal Parking',
})[v];
