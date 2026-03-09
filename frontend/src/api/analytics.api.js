import api from './axios';
export const analyticsApi = {
    getSummary: () => api.get('/analytics/summary'),
    getTrafficFlow: (params) => api.get('/analytics/traffic-flow', { params }),
    getViolationStats: (params) => api.get('/analytics/violations', { params }),
    getDensityTimeline: (params) => api.get('/analytics/density', { params }),
    getVehicleCountTimeline: (params) => api.get('/analytics/vehicle-count', { params }),
    getSpeedTimeline: (params) => api.get('/analytics/speed', { params }),
};
