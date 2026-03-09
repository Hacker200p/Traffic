import api from './axios';
import type { ApiResponse, Vehicle, FilterParams } from '@/types';

export const vehiclesApi = {
  list: (params?: FilterParams) =>
    api.get<ApiResponse<Vehicle[]>>('/vehicles', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Vehicle>>(`/vehicles/${id}`),

  create: (body: Partial<Vehicle>) =>
    api.post<ApiResponse<Vehicle>>('/vehicles', body),

  update: (id: string, body: Partial<Vehicle>) =>
    api.patch<ApiResponse<Vehicle>>(`/vehicles/${id}`, body),

  delete: (id: string) =>
    api.delete(`/vehicles/${id}`),

  reportLost: (id: string, body: { description?: string }) =>
    api.post<ApiResponse<Vehicle>>(`/vehicles/${id}/report-lost`, body),

  markFound: (id: string) =>
    api.post<ApiResponse<Vehicle>>(`/vehicles/${id}/mark-found`),

  getLostVehicles: (params?: FilterParams) =>
    api.get<ApiResponse<Vehicle[]>>('/vehicles/lost', { params }),
};
