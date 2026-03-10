import api from './axios';

export const notifPrefsApi = {
    getMyPrefs: () => api.get('/notification-preferences'),
    upsert: (body) => api.put('/notification-preferences', body),
    bulkUpsert: (preferences) => api.post('/notification-preferences/bulk', { preferences }),
    remove: (alertType) => api.delete(`/notification-preferences/${alertType}`),
};
