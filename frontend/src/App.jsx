import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import AppRouter from '@/router';
export default function App() {
    return (_jsxs(Provider, { store: store, children: [_jsx(AppRouter, {}), _jsx(Toaster, { position: "top-right", toastOptions: {
                    style: {
                        background: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #334155',
                        fontSize: '14px',
                    },
                } })] }));
}
