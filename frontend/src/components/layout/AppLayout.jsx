import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useWebSocket } from '@/hooks/useWebSocket';
export default function AppLayout() {
    // Connect to WebSocket on layout mount
    useWebSocket(true);
    return (_jsxs("div", { className: "flex min-h-screen bg-dark-950", children: [_jsx(Sidebar, {}), _jsxs("div", { className: "ml-64 flex flex-1 flex-col", children: [_jsx(Header, {}), _jsx("main", { className: "flex-1 p-6", children: _jsx(Outlet, {}) })] })] }));
}
