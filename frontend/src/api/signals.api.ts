import api from './axios';
import type { ApiResponse, TrafficSignal, FilterParams } from '@/types';

export const signalsApi = {
  list: (params?: FilterParams) =>
    api.get<ApiResponse<TrafficSignal[]>>('/traffic-signals', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<TrafficSignal>>(`/traffic-signals/${id}`),

  updateState: (id: string, body: { state: string; duration?: number }) =>
    api.patch<ApiResponse<TrafficSignal>>(`/traffic-signals/${id}/state`, body),

  setMode: (id: string, mode: 'auto' | 'manual' | 'emergency') =>
    api.patch<ApiResponse<TrafficSignal>>(`/traffic-signals/${id}/mode`, { mode }),
};
