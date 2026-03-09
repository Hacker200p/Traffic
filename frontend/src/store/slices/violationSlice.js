import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { violationsApi } from '@/api/violations.api';
const initialState = {
    items: [],
    selected: null,
    stats: null,
    loading: false,
    error: null,
    total: 0,
    page: 1,
};
export const fetchViolations = createAsyncThunk('violations/fetchAll', async (params, { rejectWithValue }) => {
    try {
        const { data } = await violationsApi.list(params);
        return { items: data.data, meta: data.meta };
    }
    catch {
        return rejectWithValue('Failed to load violations');
    }
});
export const fetchViolationStats = createAsyncThunk('violations/fetchStats', async (params, { rejectWithValue }) => {
    try {
        const { data } = await violationsApi.getStats(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load violation stats');
    }
});
const violationSlice = createSlice({
    name: 'violations',
    initialState,
    reducers: {
        clearSelected(state) {
            state.selected = null;
        },
        addViolation(state, action) {
            state.items.unshift(action.payload);
            state.total += 1;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchViolations.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchViolations.fulfilled, (state, { payload }) => {
            state.loading = false;
            state.items = payload.items;
            state.total = payload.meta?.total ?? payload.items.length;
            state.page = payload.meta?.page ?? 1;
        })
            .addCase(fetchViolations.rejected, (state, { payload }) => {
            state.loading = false;
            state.error = payload;
        })
            .addCase(fetchViolationStats.fulfilled, (state, { payload }) => {
            state.stats = payload;
        });
    },
});
export const { clearSelected, addViolation } = violationSlice.actions;
export default violationSlice.reducer;
