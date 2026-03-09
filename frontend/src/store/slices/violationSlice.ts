import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { violationsApi } from '@/api/violations.api';
import type { Violation, FilterParams } from '@/types';

interface ViolationState {
  items: Violation[];
  selected: Violation | null;
  stats: { total: number; byType: Record<string, number>; bySeverity: Record<string, number> } | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
}

const initialState: ViolationState = {
  items: [],
  selected: null,
  stats: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
};

export const fetchViolations = createAsyncThunk(
  'violations/fetchAll',
  async (params: FilterParams | undefined, { rejectWithValue }) => {
    try {
      const { data } = await violationsApi.list(params);
      return { items: data.data, meta: data.meta };
    } catch {
      return rejectWithValue('Failed to load violations');
    }
  },
);

export const fetchViolationStats = createAsyncThunk(
  'violations/fetchStats',
  async (params: { from?: string; to?: string } | undefined, { rejectWithValue }) => {
    try {
      const { data } = await violationsApi.getStats(params);
      return data.data;
    } catch {
      return rejectWithValue('Failed to load violation stats');
    }
  },
);

const violationSlice = createSlice({
  name: 'violations',
  initialState,
  reducers: {
    clearSelected(state) {
      state.selected = null;
    },
    addViolation(state, action: PayloadAction<Violation>) {
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
        state.error = payload as string;
      })
      .addCase(fetchViolationStats.fulfilled, (state, { payload }) => {
        state.stats = payload;
      });
  },
});

export const { clearSelected, addViolation } = violationSlice.actions;
export default violationSlice.reducer;
