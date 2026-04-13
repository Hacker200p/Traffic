import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import LiveMapPage from '@/pages/LiveMapPage';
import VehicleTrackingPage from '@/pages/VehicleTrackingPage';
import LostVehiclePage from '@/pages/LostVehiclePage';
import ViolationManagementPage from '@/pages/ViolationManagementPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SignalsPage from '@/pages/SignalsPage';
import AdminControlPanel from '@/pages/AdminControlPanel';
import AccidentDetectionPage from '@/pages/AccidentDetectionPage';
import PredictiveRoutePage from '@/pages/PredictiveRoutePage';
const router = createBrowserRouter([
    {
        path: '/login',
        element: _jsx(LoginPage, {}),
    },
    {
        element: (_jsx(ProtectedRoute, { children: _jsx(AppLayout, {}) })),
        children: [
            { index: true, element: _jsx(DashboardPage, {}) },
            { path: 'map', element: _jsx(LiveMapPage, {}) },
            { path: 'vehicles', element: _jsx(VehicleTrackingPage, {}) },
            { path: 'lost-vehicles', element: _jsx(LostVehiclePage, {}) },
            { path: 'violations', element: _jsx(ViolationManagementPage, {}) },
            { path: 'analytics', element: _jsx(AnalyticsPage, {}) },
            { path: 'signals', element: _jsx(SignalsPage, {}) },
            { path: 'admin', element: _jsx(ProtectedRoute, { roles: ['admin'], children: _jsx(AdminControlPanel, {}) }) },
            { path: 'accidents', element: _jsx(AccidentDetectionPage, {}) },
            { path: 'predict-route', element: _jsx(PredictiveRoutePage, {}) },
        ],
    },
], { future: { v7_startTransition: true } });
export default function AppRouter() {
    return _jsx(RouterProvider, { router: router });
}
