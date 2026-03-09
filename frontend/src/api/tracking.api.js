import api from './axios';
export const trackingApi = {
    getHistory: (vehicleId, params) => api.get(`/tracking/${vehicleId}/history`, { params }),
    getLatest: (vehicleId) => api.get(`/tracking/${vehicleId}/latest`),
    getLivePositions: () => api.get('/tracking/live'),
    getRoute: (vehicleId, params) => api.get(`/tracking/${vehicleId}/route`, { params }),
};
