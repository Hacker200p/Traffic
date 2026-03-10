import api from './axios';

export const challansApi = {
    generate: (violationId, fineAmount) =>
        api.post('/challans/generate', { violationId, fineAmount }),
    list: (params) => api.get('/challans', { params }),
    getById: (id) => api.get(`/challans/${id}`),
    updateStatus: (id, data) => api.patch(`/challans/${id}`, data),
    resend: (id) => api.post(`/challans/${id}/resend`),
    getStats: (params) => api.get('/challans/stats', { params }),
};
