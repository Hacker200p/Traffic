import api from './axios';
export const violationsApi = {
    list: (params) => api.get('/violations', { params }),
    getById: (id) => api.get(`/violations/${id}`),
    updateStatus: (id, status) => api.patch(`/violations/${id}`, { status }),
    getStats: (params) => api.get('/violations/stats', { params }),
};
