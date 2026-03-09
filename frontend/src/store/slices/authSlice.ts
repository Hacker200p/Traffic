import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '@/api/auth.api';
import { persistAuth, clearAuth, loadAuthFromStorage } from '@/utils/helpers';
import type { AuthState, LoginPayload, User, AuthTokens } from '@/types';

const stored = loadAuthFromStorage();

const initialState: AuthState = {
  user: stored.user,
  tokens: stored.tokens,
  loading: false,
  error: null,
};

/* ── Thunks ───────────────────────────────────────────────────────────────── */
export const login = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const { data } = await authApi.login(payload);
      return data.data; // { user, tokens }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Login failed';
      return rejectWithValue(msg);
    }
  },
);

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authApi.me();
    return data.data;
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Session expired';
    return rejectWithValue(msg);
  }
});

/* ── Slice ────────────────────────────────────────────────────────────────── */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.tokens = null;
      state.error = null;
      clearAuth();
    },
    setCredentials(state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      persistAuth(action.payload.user, action.payload.tokens);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* login */
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user = payload.user;
        state.tokens = payload.tokens;
        persistAuth(payload.user, payload.tokens);
      })
      .addCase(login.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = (payload as string) ?? 'Login failed';
      })
      /* fetchMe */
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.user = payload;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.tokens = null;
        clearAuth();
      });
  },
});

export const { logout, setCredentials, clearError } = authSlice.actions;
export default authSlice.reducer;
