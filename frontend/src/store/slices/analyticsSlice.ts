import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { analyticsApi } from '@/api/analytics.api';
import type { AnalyticsSummary, TrafficFlowData, ViolationStats, TimeSeriesPoint } from '@/types';

interface AnalyticsState {
  summary: AnalyticsSummary | null;
  trafficFlow: TrafficFlowData[];
  violationStats: ViolationStats[];
  densityTimeline: TimeSeriesPoint[];
  vehicleCountTimeline: TimeSeriesPoint[];
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  summary: null,
  trafficFlow: [],
  violationStats: [],
  densityTimeline: [],
  vehicleCountTimeline: [],
  loading: false,
  error: null,
};

export const fetchAnalyticsSummary = createAsyncThunk('analytics/summary', async (_, { rejectWithValue }) => {
  try {
    const { data } = await analyticsApi.getSummary();
    return data.data;
  } catch {
    return rejectWithValue('Failed to load summary');
  }
});

export const fetchTrafficFlow = createAsyncThunk(
  'analytics/flow',
  async (params: { from?: string; to?: string; interval?: string } | undefined, { rejectWithValue }) => {
    try {
      const { data } = await analyticsApi.getTrafficFlow(params);
      return data.data;
    } catch {
      return rejectWithValue('Failed to load traffic flow');
    }
  },
);

export const fetchViolationAnalytics = createAsyncThunk(
  'analytics/violations',
  async (params: { from?: string; to?: string } | undefined, { rejectWithValue }) => {
    try {
      const { data } = await analyticsApi.getViolationStats(params);
      return data.data;
    } catch {
      return rejectWithValue('Failed to load violation analytics');
    }
  },
);

export const fetchDensityTimeline = createAsyncThunk(
  'analytics/density',
  async (params: { zoneId?: string; from?: string; to?: string } | undefined, { rejectWithValue }) => {
    try {
      const { data } = await analyticsApi.getDensityTimeline(params);
      return data.data;
    } catch {
      return rejectWithValue('Failed to load density timeline');
    }
  },
);

export const fetchVehicleCountTimeline = createAsyncThunk(
  'analytics/vehicleCount',
  async (params: { from?: string; to?: string } | undefined, { rejectWithValue }) => {
    try {
      const { data } = await analyticsApi.getVehicleCountTimeline(params);
      return data.data;
    } catch {
      return rejectWithValue('Failed to load vehicle count');
    }
  },
);

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
        state.error = payload as string;
      })
      .addCase(fetchTrafficFlow.fulfilled, (state, { payload }) => { state.trafficFlow = payload; })
      .addCase(fetchViolationAnalytics.fulfilled, (state, { payload }) => { state.violationStats = payload; })
      .addCase(fetchDensityTimeline.fulfilled, (state, { payload }) => { state.densityTimeline = payload; })
      .addCase(fetchVehicleCountTimeline.fulfilled, (state, { payload }) => { state.vehicleCountTimeline = payload; });
  },
});

export default analyticsSlice.reducer;
