import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import vehicleReducer from './slices/vehicleSlice';
import violationReducer from './slices/violationSlice';
import trackingReducer from './slices/trackingSlice';
import alertReducer from './slices/alertSlice';
import signalReducer from './slices/signalSlice';
import analyticsReducer from './slices/analyticsSlice';
import accidentReducer from './slices/accidentSlice';
export const store = configureStore({
    reducer: {
        auth: authReducer,
        vehicles: vehicleReducer,
        violations: violationReducer,
        tracking: trackingReducer,
        alerts: alertReducer,
        signals: signalReducer,
        analytics: analyticsReducer,
        accidents: accidentReducer,
    },
    devTools: import.meta.env.DEV,
});
