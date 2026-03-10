import api from './axios';
export const trackingApi = {
    getHistory: (vehicleId, params) => api.get('/tracking/history', { params: { vehicleId, ...params } }),
    getLatest: () => api.get('/tracking/latest'),
    getLivePositions: () => api.get('/tracking/latest'),
    getRoute: (vehicleId, params) => api.get('/tracking/history', { params: { vehicleId, ...params } }),
    getVehiclesInRadius: (params) => api.get('/tracking/geofence', { params }),
};
