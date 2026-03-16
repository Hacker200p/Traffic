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
const normalizeLivePosition = (position) => {
    if (!position)
        return null;
    const latitude = position.location?.latitude ?? position.latitude;
    const longitude = position.location?.longitude ?? position.longitude;
    if (latitude == null || longitude == null)
        return null;
    const speed = position.speed == null ? null : Number(position.speed);
    const heading = position.heading == null ? null : Number(position.heading);
    return {
        ...position,
        vehicleId: position.vehicleId ?? position.vehicle_id,
        plateNumber: position.plateNumber ?? position.plate_number,
        vehicleType: position.vehicleType ?? position.vehicle_type,
        speed: Number.isFinite(speed) ? speed : null,
        heading: Number.isFinite(heading) ? heading : null,
        timestamp: position.timestamp ?? position.recordedAt ?? position.recorded_at,
        location: {
            latitude: Number(latitude),
            longitude: Number(longitude),
        },
    };
};
const normalizeCamera = (camera) => {
    if (!camera)
        return null;
    const latitude = camera.location?.latitude ?? camera.latitude;
    const longitude = camera.location?.longitude ?? camera.longitude;
    if (latitude == null || longitude == null)
        return null;
    return {
        ...camera,
        type: camera.type ?? camera.cameraType ?? camera.camera_type ?? 'fixed',
        isOnline: camera.isOnline ?? camera.is_online ?? false,
        location: {
            latitude: Number(latitude),
            longitude: Number(longitude),
        },
    };
};
export const fetchLivePositions = createAsyncThunk('tracking/live', async (_, { rejectWithValue }) => {
    try {
        const { data } = await trackingApi.getLivePositions();
        const positions = Array.isArray(data.data) ? data.data : [];
        return positions.map(normalizeLivePosition).filter(Boolean);
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
        const cameras = Array.isArray(data.data) ? data.data : [];
        return cameras.map(normalizeCamera).filter(Boolean);
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
            const normalized = normalizeLivePosition(action.payload);
            if (!normalized)
                return;
            const idx = state.livePositions.findIndex((p) => p.vehicleId === normalized.vehicleId);
            if (idx !== -1) {
                state.livePositions[idx] = normalized;
            }
            else {
                state.livePositions.push(normalized);
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
