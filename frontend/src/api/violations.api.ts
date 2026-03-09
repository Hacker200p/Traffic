import api from './axios';
import type { ApiResponse, Violation, FilterParams } from '@/types';

export const violationsApi = {
  list: (params?: FilterParams) =>
    api.get<ApiResponse<Violation[]>>('/violations', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Violation>>(`/violations/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Violation>>(`/violations/${id}/status`, { status }),

  getStats: (params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<{ total: number; byType: Record<string, number>; bySeverity: Record<string, number> }>>(
      '/violations/stats', { params },
    ),
};
