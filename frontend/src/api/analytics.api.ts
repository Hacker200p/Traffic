import api from './axios';
import type { ApiResponse, AnalyticsSummary, TrafficFlowData, ViolationStats, TimeSeriesPoint } from '@/types';

export const analyticsApi = {
  getSummary: () =>
    api.get<ApiResponse<AnalyticsSummary>>('/analytics/summary'),

  getTrafficFlow: (params?: { from?: string; to?: string; interval?: string }) =>
    api.get<ApiResponse<TrafficFlowData[]>>('/analytics/traffic-flow', { params }),

  getViolationStats: (params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<ViolationStats[]>>('/analytics/violations', { params }),

  getDensityTimeline: (params?: { zoneId?: string; from?: string; to?: string }) =>
    api.get<ApiResponse<TimeSeriesPoint[]>>('/analytics/density', { params }),

  getVehicleCountTimeline: (params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<TimeSeriesPoint[]>>('/analytics/vehicle-count', { params }),

  getSpeedTimeline: (params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<TimeSeriesPoint[]>>('/analytics/speed', { params }),
};
