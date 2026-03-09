import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { signalsApi } from '@/api/signals.api';
import type { TrafficSignal, FilterParams, SignalState as SigState } from '@/types';

interface SignalSliceState {
  items: TrafficSignal[];
  loading: boolean;
  error: string | null;
}

const initialState: SignalSliceState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchSignals = createAsyncThunk(
  'signals/fetchAll',
  async (params: FilterParams | undefined, { rejectWithValue }) => {
    try {
      const { data } = await signalsApi.list(params);
      return data.data;
    } catch {
      return rejectWithValue('Failed to load signals');
    }
  },
);

const signalSlice = createSlice({
  name: 'signals',
  initialState,
  reducers: {
    updateSignal(state, action: PayloadAction<{ id: string; state: SigState; remainingSeconds: number }>) {
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
        state.error = payload as string;
      });
  },
});

export const { updateSignal } = signalSlice.actions;
export default signalSlice.reducer;
