import api from './axios';
export const authApi = {
    login: (payload) => api.post('/auth/login', payload),
    register: (payload) => api.post('/auth/register', payload),
    refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
    me: () => api.get('/auth/profile'),
    logout: () => api.post('/auth/logout'),
};
