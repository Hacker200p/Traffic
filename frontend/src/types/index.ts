/* ── Types shared across the frontend ──────────────────────────────────────── */

// ── Auth ─────────────────────────────────────────────────────────────────────
export type Role = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
}

// ── Vehicles ─────────────────────────────────────────────────────────────────
export type VehicleType = 'car' | 'motorcycle' | 'bus' | 'truck' | 'bicycle' | 'unknown';

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: VehicleType;
  color?: string;
  owner?: string;
  isLost: boolean;
  lostReportedAt?: string;
  lastSeenAt?: string;
  lastLocation?: GeoPoint;
  createdAt: string;
  updatedAt: string;
}

// ── Tracking ─────────────────────────────────────────────────────────────────
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface TrackingRecord {
  id: string;
  vehicleId: string;
  plateNumber?: string;
  location: GeoPoint;
  speed?: number;
  heading?: number;
  cameraId?: string;
  timestamp: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
}

// ── Violations ───────────────────────────────────────────────────────────────
export type ViolationType = 'red_light' | 'speeding' | 'no_helmet' | 'wrong_way' | 'illegal_parking';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ViolationStatus = 'pending' | 'confirmed' | 'dismissed' | 'appealed';

export interface Violation {
  id: string;
  vehicleId?: string;
  plateNumber?: string;
  type: ViolationType;
  severity: Severity;
  status: ViolationStatus;
  location: GeoPoint;
  cameraId?: string;
  imageUrl?: string;
  description?: string;
  fineAmount?: number;
  detectedAt: string;
  resolvedAt?: string;
}

// ── Alerts ───────────────────────────────────────────────────────────────────
export type AlertType = 'lost_vehicle_spotted' | 'high_density' | 'signal_failure' | 'violation_surge' | 'system';
export type AlertPriority = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  location?: GeoPoint;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ── Traffic Signals ──────────────────────────────────────────────────────────
export type SignalState = 'red' | 'yellow' | 'green' | 'flashing' | 'off';

export interface TrafficSignal {
  id: string;
  name: string;
  location: GeoPoint;
  currentState: SignalState;
  remainingSeconds?: number;
  mode: 'auto' | 'manual' | 'emergency';
  intersection?: string;
  isOnline: boolean;
  lastUpdatedAt: string;
}

// ── Density ──────────────────────────────────────────────────────────────────
export type DensityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DensityZone {
  id: string;
  name: string;
  bounds: [GeoPoint, GeoPoint]; // SW, NE corners
  level: DensityLevel;
  vehicleCount: number;
  occupancyRatio: number;
  suggestedGreenDuration?: number;
  updatedAt: string;
}

// ── Camera ───────────────────────────────────────────────────────────────────
export interface Camera {
  id: string;
  name: string;
  location: GeoPoint;
  type: 'surveillance' | 'anpr' | 'traffic';
  isOnline: boolean;
  streamUrl?: string;
}

// ── Analytics ────────────────────────────────────────────────────────────────
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface TrafficFlowData {
  period: string;
  vehicleCount: number;
  avgSpeed: number;
  density: number;
}

export interface ViolationStats {
  type: ViolationType;
  count: number;
  percentage: number;
}

export interface AnalyticsSummary {
  totalVehiclesToday: number;
  totalViolationsToday: number;
  avgSpeedKmh: number;
  activeCameras: number;
  onlineSignals: number;
  lostVehiclesCount: number;
  alertsUnread: number;
  densityLevel: DensityLevel;
}

// ── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── WebSocket Events ─────────────────────────────────────────────────────────
export interface WsVehicleUpdate {
  vehicleId: string;
  location: GeoPoint;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export interface WsSignalUpdate {
  signalId: string;
  state: SignalState;
  remainingSeconds: number;
}

export interface WsDensityUpdate {
  zoneId: string;
  level: DensityLevel;
  vehicleCount: number;
  occupancyRatio: number;
}

export interface WsAlertEvent {
  alert: Alert;
}

export interface WsViolationEvent {
  violation: Violation;
}

// ── Table / Filter ───────────────────────────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  sortBy: string;
  order: 'asc' | 'desc';
}

export interface FilterParams extends PaginationParams, Partial<SortParams> {
  search?: string;
  [key: string]: unknown;
}
