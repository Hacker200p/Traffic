import api from './axios';
export const signalsApi = {
    list: (params) => api.get('/signals', { params }),
    getById: (id) => api.get(`/signals/${id}`),
    updateState: (id, body) => api.post(`/signals/${id}/state`, body),
    setMode: (id, mode) => api.patch(`/signals/${id}`, {
        isAutonomous: mode === 'auto',
        ...(mode === 'emergency' ? { currentState: 'red' } : {}),
    }),
    getGroupSignals: (groupId) => api.get(`/signals/group/${groupId}`),
    getActiveOverrides: () => api.get('/signals/active-overrides'),
    getStateLog: (id, params) => api.get(`/signals/${id}/log`, { params }),
    createSchedule: (id, body) => api.post(`/signals/${id}/schedule`, body),
    getSchedules: (id) => api.get(`/signals/${id}/schedules`),
};
