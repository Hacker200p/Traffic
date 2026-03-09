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

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'map', element: <LiveMapPage /> },
      { path: 'vehicles', element: <VehicleTrackingPage /> },
      { path: 'lost-vehicles', element: <LostVehiclePage /> },
      { path: 'violations', element: <ViolationManagementPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'signals', element: <SignalsPage /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
