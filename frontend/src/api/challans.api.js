import api from './axios';

export const challansApi = {
    generate: (violationId, fineAmount) =>
        api.post('/challans/generate', { violationId, fineAmount }),
    list: (params) => api.get('/challans', { params }),
    getPending: (params) => api.get('/challans/pending', { params }),
    getById: (id) => api.get(`/challans/${id}`),
    updateStatus: (id, data) => api.patch(`/challans/${id}`, data),
    approve: (id, data) => api.post(`/challans/${id}/approve`, data),
    reject: (id, reason) => api.post(`/challans/${id}/reject`, { reason }),
    resend: (id) => api.post(`/challans/${id}/resend`),
    getStats: (params) => api.get('/challans/stats', { params }),
};
