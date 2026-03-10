import api from './axios';
export const alertsApi = {
    list: (params) => api.get('/alerts', { params }),
    getById: (id) => api.get(`/alerts/${id}`),
    markRead: (id) => api.patch(`/alerts/${id}`, { status: 'acknowledged' }),
    update: (id, body) => api.patch(`/alerts/${id}`, body),
    getActiveCount: () => api.get('/alerts/active-count'),
};
