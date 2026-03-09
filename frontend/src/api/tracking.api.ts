import api from './axios';
import type { ApiResponse, TrackingRecord, FilterParams } from '@/types';

export const trackingApi = {
  getHistory: (vehicleId: string, params?: FilterParams) =>
    api.get<ApiResponse<TrackingRecord[]>>(`/tracking/${vehicleId}/history`, { params }),

  getLatest: (vehicleId: string) =>
    api.get<ApiResponse<TrackingRecord>>(`/tracking/${vehicleId}/latest`),

  getLivePositions: () =>
    api.get<ApiResponse<TrackingRecord[]>>('/tracking/live'),

  getRoute: (vehicleId: string, params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<TrackingRecord[]>>(`/tracking/${vehicleId}/route`, { params }),
};
