import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchViolations, fetchViolationStats } from '@/store/slices/violationSlice';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import ViolationChart from '@/components/charts/ViolationChart';
import { formatDateTime, violationLabel, severityLabel } from '@/utils/formatters';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { violationsApi } from '@/api/violations.api';
import toast from 'react-hot-toast';
import RoleGate from '@/components/auth/RoleGate';
const severityVariant = (s) => ({ low: 'info', medium: 'warning', high: 'danger', critical: 'danger' }[s]);
const statusVariant = (s) => ({
    pending: 'warning',
    confirmed: 'danger',
    dismissed: 'neutral',
    appealed: 'info',
}[s]);
export default function ViolationManagementPage() {
    const dispatch = useAppDispatch();
    const { items, loading, total, page } = useAppSelector((s) => s.violations);
    const { violationStats } = useAppSelector((s) => s.analytics);
    const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);
    const [typeFilter, setTypeFilter] = useState('');
    useEffect(() => {
        dispatch(fetchViolations({ page: 1, limit: DEFAULT_PAGE_SIZE, type: typeFilter || undefined }));
        dispatch(fetchViolationStats());
    }, [dispatch, typeFilter]);
    const handleStatus = async (id, status) => {
        try {
            await violationsApi.updateStatus(id, status);
            toast.success(`Violation ${status}`);
            dispatch(fetchViolations({ page: page, limit: DEFAULT_PAGE_SIZE, type: typeFilter || undefined }));
        }
        catch {
            toast.error('Failed to update violation');
        }
    };
    const handlePageChange = (p) => {
        dispatch(fetchViolations({ page: p, limit: DEFAULT_PAGE_SIZE, type: typeFilter || undefined }));
    };
    const columns = [
        {
            key: 'type',
            header: 'Type',
            render: (v) => (_jsx("span", { className: "text-sm font-medium text-white", children: violationLabel(v.type) })),
        },
        {
            key: 'severity',
            header: 'Severity',
            render: (v) => (_jsx(StatusBadge, { label: severityLabel(v.severity) ?? v.severity, variant: severityVariant(v.severity), dot: true })),
        },
        {
            key: 'plate',
            header: 'Plate',
            render: (v) => (_jsx("span", { className: "font-mono text-xs text-dark-300", children: v.plateNumber ?? '—' })),
        },
        {
            key: 'status',
            header: 'Status',
            render: (v) => (_jsx(StatusBadge, { label: v.status, variant: statusVariant(v.status) })),
        },
        {
            key: 'detected',
            header: 'Detected',
            sortable: true,
            render: (v) => formatDateTime(v.createdAt),
        },
        {
            key: 'actions',
            header: '',
            render: (v) => v.status === 'pending' ? (_jsx("div", { className: "flex gap-1", children: _jsxs(RoleGate, { roles: ['admin', 'police'], children: [_jsx("button", { onClick: () => handleStatus(v.id, 'confirmed'), className: "rounded bg-red-600/10 px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-600/20", children: "Confirm" }), _jsx("button", { onClick: () => handleStatus(v.id, 'dismissed'), className: "rounded bg-dark-600 px-2 py-1 text-[11px] font-medium text-dark-300 hover:bg-dark-500", children: "Dismiss" })] }) })) : null,
        },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Violation Management" }), _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "Review, confirm, or dismiss detected violations" })] }), _jsxs("select", { value: typeFilter, onChange: (e) => setTypeFilter(e.target.value), className: "rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-white outline-none focus:border-primary-500", children: [_jsx("option", { value: "", children: "All Types" }), _jsx("option", { value: "red_light", children: "Red Light" }), _jsx("option", { value: "speeding", children: "Speeding" }), _jsx("option", { value: "no_helmet", children: "No Helmet" }), _jsx("option", { value: "wrong_way", children: "Wrong Way" }), _jsx("option", { value: "illegal_parking", children: "Illegal Parking" })] })] }), _jsx(ViolationChart, { data: violationStats }), _jsx(DataTable, { columns: columns, data: items, keyExtractor: (v) => v.id, page: page, totalPages: totalPages, onPageChange: handlePageChange, loading: loading, emptyMessage: "No violations found" })] }));
}
