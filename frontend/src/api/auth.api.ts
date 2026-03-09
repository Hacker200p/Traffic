import api from './axios';
import type { ApiResponse, AuthTokens, LoginPayload, User } from '@/types';

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', payload),

  register: (payload: { email: string; password: string; name: string }) =>
    api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/register', payload),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }),

  me: () => api.get<ApiResponse<User>>('/auth/me'),

  logout: () => api.post('/auth/logout'),
};
