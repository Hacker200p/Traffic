import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { signalsApi } from '@/api/signals.api';
const initialState = {
    items: [],
    loading: false,
    error: null,
};
export const fetchSignals = createAsyncThunk('signals/fetchAll', async (params, { rejectWithValue }) => {
    try {
        const { data } = await signalsApi.list(params);
        return data.data;
    }
    catch {
        return rejectWithValue('Failed to load signals');
    }
});
const signalSlice = createSlice({
    name: 'signals',
    initialState,
    reducers: {
        updateSignal(state, action) {
            const sig = state.items.find((s) => s.id === action.payload.id);
            if (sig) {
                sig.currentState = action.payload.state;
                sig.remainingSeconds = action.payload.remainingSeconds;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSignals.pending, (state) => { state.loading = true; })
            .addCase(fetchSignals.fulfilled, (state, { payload }) => {
            state.loading = false;
            state.items = payload;
        })
            .addCase(fetchSignals.rejected, (state, { payload }) => {
            state.loading = false;
            state.error = payload;
        });
    },
});
export const { updateSignal } = signalSlice.actions;
export default signalSlice.reducer;
