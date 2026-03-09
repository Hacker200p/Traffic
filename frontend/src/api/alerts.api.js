import api from './axios';
export const alertsApi = {
    list: (params) => api.get('/alerts', { params }),
    getById: (id) => api.get(`/alerts/${id}`),
    markRead: (id) => api.patch(`/alerts/${id}/read`),
    markAllRead: () => api.patch('/alerts/read-all'),
    getUnreadCount: () => api.get('/alerts/unread-count'),
};
