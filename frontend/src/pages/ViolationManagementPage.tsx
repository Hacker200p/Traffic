import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchViolations, fetchViolationStats } from '@/store/slices/violationSlice';
import DataTable, { Column } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import ViolationChart from '@/components/charts/ViolationChart';
import { formatDateTime, violationLabel, severityLabel } from '@/utils/formatters';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { violationsApi } from '@/api/violations.api';
import type { Violation, ViolationStatus, Severity } from '@/types';
import toast from 'react-hot-toast';
import RoleGate from '@/components/auth/RoleGate';

const severityVariant = (s: Severity) =>
  ({ low: 'info', medium: 'warning', high: 'danger', critical: 'danger' } as const)[s];

const statusVariant = (s: ViolationStatus) =>
  ({
    pending: 'warning',
    confirmed: 'danger',
    dismissed: 'neutral',
    appealed: 'info',
  } as const)[s];

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

  const handleStatus = async (id: string, status: string) => {
    try {
      await violationsApi.updateStatus(id, status);
      toast.success(`Violation ${status}`);
      dispatch(fetchViolations({ page: page, limit: DEFAULT_PAGE_SIZE, type: typeFilter || undefined }));
    } catch {
      toast.error('Failed to update violation');
    }
  };

  const handlePageChange = (p: number) => {
    dispatch(fetchViolations({ page: p, limit: DEFAULT_PAGE_SIZE, type: typeFilter || undefined }));
  };

  const columns: Column<Violation>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (v) => (
        <span className="text-sm font-medium text-white">{violationLabel(v.type)}</span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (v) => (
        <StatusBadge label={severityLabel(v.severity) ?? v.severity} variant={severityVariant(v.severity)} dot />
      ),
    },
    {
      key: 'plate',
      header: 'Plate',
      render: (v) => (
        <span className="font-mono text-xs text-dark-300">{v.plateNumber ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <StatusBadge label={v.status} variant={statusVariant(v.status)} />
      ),
    },
    {
      key: 'detected',
      header: 'Detected',
      sortable: true,
      render: (v) => formatDateTime(v.detectedAt),
    },
    {
      key: 'actions',
      header: '',
      render: (v) =>
        v.status === 'pending' ? (
          <div className="flex gap-1">
            <RoleGate roles={['admin', 'operator']}>
              <button
                onClick={() => handleStatus(v.id, 'confirmed')}
                className="rounded bg-red-600/10 px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-600/20"
              >
                Confirm
              </button>
              <button
                onClick={() => handleStatus(v.id, 'dismissed')}
                className="rounded bg-dark-600 px-2 py-1 text-[11px] font-medium text-dark-300 hover:bg-dark-500"
              >
                Dismiss
              </button>
            </RoleGate>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Violation Management</h1>
          <p className="mt-1 text-sm text-dark-400">Review, confirm, or dismiss detected violations</p>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
        >
          <option value="">All Types</option>
          <option value="red_light">Red Light</option>
          <option value="speeding">Speeding</option>
          <option value="no_helmet">No Helmet</option>
          <option value="wrong_way">Wrong Way</option>
          <option value="illegal_parking">Illegal Parking</option>
        </select>
      </div>

      {/* Chart */}
      <ViolationChart data={violationStats} />

      {/* Table */}
      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(v) => v.id}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        loading={loading}
        emptyMessage="No violations found"
      />
    </div>
  );
}
