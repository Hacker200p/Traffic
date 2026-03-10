import api from './axios';
export const trackingApi = {
    getHistory: (vehicleId, params) => api.get('/tracking/history', { params: { vehicleId, ...params } }),
    getLatest: () => api.get('/tracking/latest'),
    getLivePositions: () => api.get('/tracking/latest'),
    getRoute: (vehicleId, params) => api.get('/tracking/history', { params: { vehicleId, ...params } }),
    getVehiclesInRadius: (params) => api.get('/tracking/geofence', { params }),
    // Vehicle movement across cameras
    getMovement: (plateNumber, params) => api.get('/movement/track', { params: { plateNumber, ...params } }),
    // Camera management
    getCameras: () => api.get('/movement/cameras'),
    getCameraById: (id) => api.get(`/movement/cameras/${id}`),
    // Last sightings for lost/stolen vehicle tracking
    getLastSightings: (vehicleIds) => api.post('/movement/last-sightings', { vehicleIds }),
    getLastSighting: (vehicleId) => api.get(`/movement/last-sighting/${vehicleId}`),
};
