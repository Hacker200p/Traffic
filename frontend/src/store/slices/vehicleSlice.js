import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { vehiclesApi } from '@/api/vehicles.api';
const initialState = {
    items: [],
    selected: null,
    lostVehicles: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
};
export const fetchVehicles = createAsyncThunk('vehicles/fetchAll', async (params, { rejectWithValue }) => {
    try {
        const { data } = await vehiclesApi.list(params);
        return { items: data.data, meta: data.meta };
    }
    catch {
        return rejectWithValue('Failed to load vehicles');
    }
});
export const fetchLostVehicles = createAsyncThunk('vehicles/fetchLost', async (params, { rejectWithValue }) => {
    try {
        const { data } = await vehiclesApi.getLostVehicles(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load lost vehicles');
    }
});
export const fetchVehicleById = createAsyncThunk('vehicles/fetchById', async (id, { rejectWithValue }) => {
    try {
        const { data } = await vehiclesApi.getById(id);
        return data.data;
    }
    catch {
        return rejectWithValue('Vehicle not found');
    }
});
const vehicleSlice = createSlice({
    name: 'vehicles',
    initialState,
    reducers: {
        clearSelected(state) {
            state.selected = null;
        },
        updateVehicleInList(state, action) {
            const idx = state.items.findIndex((v) => v.id === action.payload.id);
            if (idx !== -1)
                state.items[idx] = action.payload;
            const lIdx = state.lostVehicles.findIndex((v) => v.id === action.payload.id);
            if (lIdx !== -1) {
                if (action.payload.isLost) {
                    state.lostVehicles[lIdx] = action.payload;
                }
                else {
                    state.lostVehicles.splice(lIdx, 1);
                }
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchVehicles.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchVehicles.fulfilled, (state, { payload }) => {
            state.loading = false;
            state.items = payload.items;
            state.total = payload.meta?.total ?? payload.items.length;
            state.page = payload.meta?.page ?? 1;
        })
            .addCase(fetchVehicles.rejected, (state, { payload }) => {
            state.loading = false;
            state.error = payload;
        })
            .addCase(fetchLostVehicles.fulfilled, (state, { payload }) => {
            state.lostVehicles = payload;
        })
            .addCase(fetchVehicleById.fulfilled, (state, { payload }) => {
            state.selected = payload;
        });
    },
});
export const { clearSelected, updateVehicleInList } = vehicleSlice.actions;
export default vehicleSlice.reducer;
