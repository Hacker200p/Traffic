import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { accidentsApi } from '@/api/accidents.api';

const initialState = {
    items: [],
    stats: null,
    total: 0,
    loading: false,
    error: null,
};

function sanitizeParams(params = {}) {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => {
            if (value === null || value === undefined) return false;
            if (typeof value === 'string' && value.trim() === '') return false;
            return true;
        })
    );
}

export const fetchAccidents = createAsyncThunk('accidents/fetchAll', async (params, { rejectWithValue }) => {
    try {
        const { data } = await accidentsApi.list(sanitizeParams(params));
        return data;
    } catch {
        return rejectWithValue('Failed to load accidents');
    }
});

export const fetchAccidentStats = createAsyncThunk('accidents/fetchStats', async (_, { rejectWithValue }) => {
    try {
        const { data } = await accidentsApi.getStats();
        return data.data;
    } catch {
        return rejectWithValue('Failed to load accident stats');
    }
});

export const updateAccidentStatus = createAsyncThunk('accidents/updateStatus', async ({ id, body }, { rejectWithValue }) => {
    try {
        const { data } = await accidentsApi.updateStatus(id, body);
        return data.data;
    } catch {
        return rejectWithValue('Failed to update accident');
    }
});

const accidentSlice = createSlice({
    name: 'accidents',
    initialState,
    reducers: {
        addAccident(state, action) {
            state.items.unshift(action.payload);
        },
        updateAccident(state, action) {
            const idx = state.items.findIndex((a) => a.id === action.payload.id);
            if (idx !== -1) state.items[idx] = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAccidents.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAccidents.fulfilled, (state, { payload }) => {
                state.loading = false;
                state.items = payload.data;
                state.total = payload.total ?? payload.data.length;
                state.error = null;
            })
            .addCase(fetchAccidents.rejected, (state, { payload }) => {
                state.loading = false;
                state.error = payload;
            })
            .addCase(fetchAccidentStats.fulfilled, (state, { payload }) => {
                state.stats = payload;
            })
            .addCase(updateAccidentStatus.fulfilled, (state, { payload }) => {
                const idx = state.items.findIndex((a) => a.id === payload.id);
                if (idx !== -1) state.items[idx] = payload;
            });
    },
});

export const { addAccident, updateAccident } = accidentSlice.actions;
export default accidentSlice.reducer;
