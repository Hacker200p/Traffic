import api from './axios';
import type { ApiResponse, Alert, FilterParams } from '@/types';

export const alertsApi = {
  list: (params?: FilterParams) =>
    api.get<ApiResponse<Alert[]>>('/alerts', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Alert>>(`/alerts/${id}`),

  markRead: (id: string) =>
    api.patch<ApiResponse<Alert>>(`/alerts/${id}/read`),

  markAllRead: () =>
    api.patch('/alerts/read-all'),

  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/alerts/unread-count'),
};
