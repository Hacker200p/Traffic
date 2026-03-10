import api from './axios';

export const restrictedZonesApi = {
    list: (params) => api.get('/restricted-zones', { params }),
    getById: (id) => api.get(`/restricted-zones/${id}`),
    create: (body) => api.post('/restricted-zones', body),
    update: (id, body) => api.patch(`/restricted-zones/${id}`, body),
    remove: (id) => api.delete(`/restricted-zones/${id}`),
};
