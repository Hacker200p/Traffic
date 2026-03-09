import api from './axios';
export const signalsApi = {
    list: (params) => api.get('/traffic-signals', { params }),
    getById: (id) => api.get(`/traffic-signals/${id}`),
    updateState: (id, body) => api.patch(`/traffic-signals/${id}/state`, body),
    setMode: (id, mode) => api.patch(`/traffic-signals/${id}/mode`, { mode }),
};
