import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { alertsApi } from '@/api/alerts.api';
const initialState = {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
};
export const fetchAlerts = createAsyncThunk('alerts/fetchAll', async (params, { rejectWithValue }) => {
    try {
        const { data } = await alertsApi.list(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load alerts');
    }
});
export const fetchUnreadCount = createAsyncThunk('alerts/unread', async (_, { rejectWithValue }) => {
    try {
        const { data } = await alertsApi.getUnreadCount();
        return data.data.count;
    }
    catch {
        return rejectWithValue(0);
    }
});
export const markAlertRead = createAsyncThunk('alerts/read', async (id) => {
    await alertsApi.markRead(id);
    return id;
});
const alertSlice = createSlice({
    name: 'alerts',
    initialState,
    reducers: {
        addAlert(state, action) {
            state.items.unshift(action.payload);
            if (!action.payload.isRead)
                state.unreadCount += 1;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAlerts.pending, (state) => { state.loading = true; })
            .addCase(fetchAlerts.fulfilled, (state, { payload }) => {
            state.loading = false;
            state.items = payload;
        })
            .addCase(fetchAlerts.rejected, (state, { payload }) => {
            state.loading = false;
            state.error = payload;
        })
            .addCase(fetchUnreadCount.fulfilled, (state, { payload }) => {
            state.unreadCount = payload;
        })
            .addCase(markAlertRead.fulfilled, (state, { payload }) => {
            const alert = state.items.find((a) => a.id === payload);
            if (alert && !alert.isRead) {
                alert.isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        });
    },
});
export const { addAlert } = alertSlice.actions;
export default alertSlice.reducer;
