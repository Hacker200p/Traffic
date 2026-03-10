import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { trackingApi } from '@/api/tracking.api';
import { analyticsApi } from '@/api/analytics.api';
const initialState = {
    livePositions: [],
    vehicleRoute: [],
    movement: null,
    cameras: [],
    loading: false,
    movementLoading: false,
    error: null,
};
export const fetchLivePositions = createAsyncThunk('tracking/live', async (_, { rejectWithValue }) => {
    try {
        const { data } = await trackingApi.getLivePositions();
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to fetch live positions');
    }
});
export const fetchVehicleRoute = createAsyncThunk('tracking/route', async ({ vehicleId, from, to }, { rejectWithValue }) => {
    try {
        const { data } = await trackingApi.getRoute(vehicleId, { from, to });
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to fetch vehicle route');
    }
});
export const fetchVehicleMovement = createAsyncThunk('tracking/movement', async ({ plateNumber, startDate, endDate }, { rejectWithValue }) => {
    try {
        const { data } = await trackingApi.getMovement(plateNumber, { startDate, endDate });
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to fetch vehicle movement');
    }
});
export const fetchCameras = createAsyncThunk('tracking/cameras', async (_, { rejectWithValue }) => {
    try {
        const { data } = await trackingApi.getCameras();
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to fetch cameras');
    }
});
const trackingSlice = createSlice({
    name: 'tracking',
    initialState,
    reducers: {
        updateLivePosition(state, action) {
            const idx = state.livePositions.findIndex((p) => p.vehicleId === action.payload.vehicleId);
            if (idx !== -1) {
                state.livePositions[idx] = action.payload;
            }
            else {
                state.livePositions.push(action.payload);
            }
        },
        clearRoute(state) {
            state.vehicleRoute = [];
            state.movement = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchLivePositions.pending, (state) => { state.loading = true; })
            .addCase(fetchLivePositions.fulfilled, (state, { payload }) => {
            state.loading = false;
            state.livePositions = payload;
        })
            .addCase(fetchLivePositions.rejected, (state, { payload }) => {
            state.loading = false;
            state.error = payload;
        })
            .addCase(fetchVehicleRoute.fulfilled, (state, { payload }) => {
            state.vehicleRoute = payload;
        })
            .addCase(fetchVehicleMovement.pending, (state) => {
            state.movementLoading = true;
            state.error = null;
        })
            .addCase(fetchVehicleMovement.fulfilled, (state, { payload }) => {
            state.movementLoading = false;
            state.movement = payload;
        })
            .addCase(fetchVehicleMovement.rejected, (state, { payload }) => {
            state.movementLoading = false;
            state.error = payload;
        })
            .addCase(fetchCameras.fulfilled, (state, { payload }) => {
            state.cameras = payload;
        });
    },
});
export const { updateLivePosition, clearRoute } = trackingSlice.actions;
export default trackingSlice.reducer;
