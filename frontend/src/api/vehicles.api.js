import api from './axios';
export const vehiclesApi = {
    list: (params) => api.get('/vehicles', { params }),
    getById: (id) => api.get(`/vehicles/${id}`),
    create: (body) => api.post('/vehicles', body),
    update: (id, body) => api.patch(`/vehicles/${id}`, body),
    delete: (id) => api.delete(`/vehicles/${id}`),
    reportLost: (id, body) => api.post(`/vehicles/${id}/report-lost`, body),
    markFound: (id) => api.post(`/vehicles/${id}/mark-found`),
    getLostVehicles: (params) => api.get('/vehicles/lost', { params }),
};
