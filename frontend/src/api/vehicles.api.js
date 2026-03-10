import api from './axios';
export const vehiclesApi = {
    list: (params) => api.get('/vehicles', { params }),
    getById: (id) => api.get(`/vehicles/${id}`),
    create: (body) => api.post('/vehicles', body),
    update: (id, body) => api.patch(`/vehicles/${id}`, body),
    delete: (id) => api.delete(`/vehicles/${id}`),
    findByPlate: (plateNumber) => api.get(`/vehicles/plate/${plateNumber}`),
    reportLost: (id, body) => api.patch(`/vehicles/${id}`, { isBlacklisted: true, ...body }),
    markFound: (id) => api.patch(`/vehicles/${id}`, { isBlacklisted: false }),
    getLostVehicles: (params) => api.get('/vehicles', { params: { isBlacklisted: true, ...params } }),
};
