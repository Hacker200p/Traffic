import api from './axios';

export const accidentsApi = {
    list: (params) => api.get('/accidents', { params }),
    getById: (id) => api.get(`/accidents/${id}`),
    updateStatus: (id, body) => api.patch(`/accidents/${id}`, body),
    getStats: () => api.get('/accidents/stats'),
    create: (body) => api.post('/accidents', body),
    analyseTelemetry: (body) => api.post('/accidents/analyse', body),
    detectCollision: (body) => api.post('/accidents/detect-collision', body),
};
