import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '@/api/auth.api';
import { persistAuth, clearAuth, loadAuthFromStorage } from '@/utils/helpers';
const stored = loadAuthFromStorage();
const initialState = {
    user: stored.user,
    tokens: stored.tokens,
    loading: false,
    error: null,
};
/* ── Thunks ───────────────────────────────────────────────────────────────── */
export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
    try {
        const { data } = await authApi.login(payload);
        return data.data; // { user, tokens }
    }
    catch (err) {
        const msg = err.response?.data?.message ?? 'Login failed';
        return rejectWithValue(msg);
    }
});
export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
    try {
        const { data } = await authApi.me();
        return data.data;
    }
    catch (err) {
        const msg = err.response?.data?.message ?? 'Session expired';
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
        setCredentials(state, action) {
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
            state.error = payload ?? 'Login failed';
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
