import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarPlus, Filter, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { backend } from '../lib/backendInstance';
import { useAsync, useDebounced } from '../lib/hooks';
import { LeaveTable } from '../components/LeaveTable';
import { Alert, PageHeader, Spinner, SummaryCard } from '../components/ui';
import { usePageTitle } from '../components/Documents';
import { STATUS_LABELS } from '../lib/format';
import type { LeaveStatus } from '../lib/types';

const STATUS_OPTIONS: (LeaveStatus | 'all')[] = ['all', 'draft', 'pending', 'approved', 'rejected', 'cancelled'];

export function MyLeavesPage() {
  const { user } = useAuth();
  usePageTitle('My leave applications');
  const [params, setParams] = useSearchParams();

  const status = (params.get('status') as LeaveStatus | 'all' | null) ?? 'all';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [category, setCategory] = useState<'all' | 'regular' | 'event'>('all');

  const { data, loading, error } = useAsync(
    () => backend.listLeaves({ scope: 'mine', status, search: debouncedSearch, category }, user!),
    [],
    `${status}|${debouncedSearch}|${category}|${user?.id ?? ''}`,
  );

  const counts = useMemo(
    () => ({
      total: data.length,
      pending: data.filter((row) => row.status === 'pending').length,
      approved: data.filter((row) => row.status === 'approved').length,
      rejected: data.filter((row) => row.status === 'rejected').length,
    }),
    [data],
  );

  const setStatus = (next: string) => {
    const params2 = new URLSearchParams(params);
    if (next === 'all') params2.delete('status');
    else params2.set('status', next);
    setParams(params2, { replace: true });
  };

  if (!user) return null;

  return (
    <div>
      <PageHeader
        title="My leave applications"
        description="Every request you have submitted, with live approval status."
      >
        <Link to="/leaves/new" className="btn-primary">
          <CalendarPlus className="h-4 w-4" /> New application
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Showing" value={counts.total} icon={<Filter className="h-5 w-5" />} tone="brand" />
        <SummaryCard label="Pending" value={counts.pending} icon={<Filter className="h-5 w-5" />} tone="amber" />
        <SummaryCard label="Approved" value={counts.approved} icon={<Filter className="h-5 w-5" />} tone="teal" />
        <SummaryCard label="Rejected" value={counts.rejected} icon={<Filter className="h-5 w-5" />} tone="rose" />
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search application no, reason, event…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search applications"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input w-auto"
              value={category}
              onChange={(event) => setCategory(event.target.value as 'all' | 'regular' | 'event')}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              <option value="regular">Regular leave</option>
              <option value="event">Event leave</option>
            </select>
            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={
                    status === option
                      ? 'rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white'
                      : 'rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200'
                  }
                >
                  {option === 'all' ? 'All' : STATUS_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading applications…" />
        ) : error ? (
          <div className="p-5">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : (
          <LeaveTable
            leaves={data}
            emptyTitle="No matching applications"
            emptyDescription="Adjust the filters, or start a new leave request."
          />
        )}
      </div>
    </div>
  );
}
