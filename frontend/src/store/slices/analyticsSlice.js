import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { analyticsApi } from '@/api/analytics.api';
const initialState = {
    summary: null,
    trafficFlow: [],
    violationStats: [],
    densityTimeline: [],
    vehicleCountTimeline: [],
    densityZones: [],
    peakHours: [],
    accidentZones: [],
    monthlyTrends: [],
    vehicleTypes: [],
    loading: false,
    error: null,
};
export const fetchAnalyticsSummary = createAsyncThunk('analytics/summary', async (_, { rejectWithValue }) => {
    try {
        const { data } = await analyticsApi.getSummary();
        const raw = data.data;
        // Flatten nested backend structure into flat object expected by pages
        return {
            totalVehiclesToday: raw.tracking?.activeVehicles ?? raw.vehicles?.totalVehicles ?? 0,
            totalViolationsToday: raw.violations?.todayViolations ?? raw.violations?.totalViolations ?? 0,
            activeCameras: Number(raw.cameras?.totalCameras ?? 0),
            onlineSignals: raw.signals?.onlineSignals ?? 0,
            avgSpeedKmh: 0,
            lostVehiclesCount: raw.vehicles?.blacklisted ?? 0,
            densityLevel: 'low',
        };
    }
    catch {
        return rejectWithValue('Failed to load summary');
    }
});
export const fetchTrafficFlow = createAsyncThunk('analytics/flow', async (params, { rejectWithValue }) => {
    try {
        const { data } = await analyticsApi.getTrafficFlow(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load traffic flow');
    }
});
export const fetchViolationAnalytics = createAsyncThunk('analytics/violations', async (params, { rejectWithValue }) => {
    try {
        const { data } = await analyticsApi.getViolationStats(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load violation analytics');
    }
});
export const fetchDensityTimeline = createAsyncThunk('analytics/density', async (params, { rejectWithValue }) => {
    try {
        const { data } = await analyticsApi.getDensityTimeline(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load density timeline');
    }
});
export const fetchVehicleCountTimeline = createAsyncThunk('analytics/vehicleCount', async (params, { rejectWithValue }) => {
    try {
        const { data } = await analyticsApi.getVehicleCountTimeline(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load vehicle count');
    }
});
export const fetchDensityZones = createAsyncThunk('analytics/densityZones', async (params, { rejectWithValue }) => {
    try {
        const { data } = await analyticsApi.getDensityZones(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load density zones');
    }
});
export const fetchPeakHours = createAsyncThunk('analytics/peakHours', async (params, { rejectWithValue }) => {
    try {
        const { data } = await analyticsApi.getPeakHours(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load peak hours');
    }
});
export const fetchAccidentZones = createAsyncThunk('analytics/accidentZones', async (params, { rejectWithValue }) => {
    try {
        const { data } = await analyticsApi.getAccidentZones(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load accident zones');
    }
});
export const fetchMonthlyTrends = createAsyncThunk('analytics/monthlyTrends', async (params, { rejectWithValue }) => {
    try {
        const { data } = await analyticsApi.getMonthlyTrends(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load monthly trends');
    }
});
export const fetchVehicleTypes = createAsyncThunk('analytics/vehicleTypes', async (_, { rejectWithValue }) => {
    try {
        const { data } = await analyticsApi.getVehicleTypes();
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load vehicle types');
    }
});
const analyticsSlice = createSlice({
    name: 'analytics',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAnalyticsSummary.pending, (state) => { state.loading = true; })
            .addCase(fetchAnalyticsSummary.fulfilled, (state, { payload }) => {
            state.loading = false;
            state.summary = payload;
        })
            .addCase(fetchAnalyticsSummary.rejected, (state, { payload }) => {
            state.loading = false;
            state.error = payload;
        })
            .addCase(fetchTrafficFlow.fulfilled, (state, { payload }) => { state.trafficFlow = payload; })
            .addCase(fetchViolationAnalytics.fulfilled, (state, { payload }) => { state.violationStats = payload; })
            .addCase(fetchDensityTimeline.fulfilled, (state, { payload }) => { state.densityTimeline = payload; })
            .addCase(fetchVehicleCountTimeline.fulfilled, (state, { payload }) => { state.vehicleCountTimeline = payload; })
            .addCase(fetchDensityZones.fulfilled, (state, { payload }) => { state.densityZones = payload; })
            .addCase(fetchPeakHours.fulfilled, (state, { payload }) => { state.peakHours = payload; })
            .addCase(fetchAccidentZones.fulfilled, (state, { payload }) => { state.accidentZones = payload; })
            .addCase(fetchMonthlyTrends.fulfilled, (state, { payload }) => { state.monthlyTrends = payload; })
            .addCase(fetchVehicleTypes.fulfilled, (state, { payload }) => { state.vehicleTypes = payload; });
    },
});
export default analyticsSlice.reducer;
