import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Inbox } from 'lucide-react';
import type { LeaveApplication } from '../lib/types';
import { LEAVE_TYPE_LABELS } from '../lib/types';
import { formatDate } from '../lib/format';
import { EmptyState, StatusBadge, cx } from './ui';

function daysLabel(leave: LeaveApplication): string {
  const days = leave.total_days ?? 1;
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function LeaveTable({
  leaves,
  showApplicant = false,
  emptyTitle = 'No leave applications yet',
  emptyDescription,
}: {
  leaves: LeaveApplication[];
  showApplicant?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (leaves.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-6 w-6" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Application</th>
              {showApplicant ? <th className="th">Applicant</th> : null}
              <th className="th">Dates</th>
              <th className="th">Days</th>
              <th className="th">Status</th>
              <th className="th">Submitted</th>
              <th className="th sr-only">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leaves.map((leave) => (
              <tr key={leave.id} className="group hover:bg-slate-50/80">
                <td className="td">
                  <Link to={`/leaves/${leave.id}`} className="block">
                    <span className="font-semibold text-slate-800 group-hover:text-brand-700">
                      {leave.application_no}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {LEAVE_TYPE_LABELS[leave.leave_type]}
                      {leave.event_name ? ` · ${leave.event_name}` : ''}
                    </span>
                  </Link>
                </td>
                {showApplicant ? (
                  <td className="td">
                    <span className="block font-medium text-slate-800">
                      {leave.applicant?.full_name ?? '—'}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {leave.applicant?.department_name ?? '—'}
                      {leave.applicant?.roll_number ? ` · ${leave.applicant.roll_number}` : ''}
                      {leave.applicant?.employee_id ? ` · ${leave.applicant.employee_id}` : ''}
                    </span>
                  </td>
                ) : null}
                <td className="td whitespace-nowrap">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
                  </span>
                </td>
                <td className="td whitespace-nowrap text-slate-600">{daysLabel(leave)}</td>
                <td className="td">
                  <StatusBadge status={leave.status} />
                </td>
                <td className="td whitespace-nowrap text-xs text-slate-500">
                  {formatDate(leave.created_at)}
                </td>
                <td className="td text-right">
                  <Link
                    to={`/leaves/${leave.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    View <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-slate-100 md:hidden">
        {leaves.map((leave) => (
          <Link
            key={leave.id}
            to={`/leaves/${leave.id}`}
            className="block px-4 py-3.5 hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{leave.application_no}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {LEAVE_TYPE_LABELS[leave.leave_type]}
                  {leave.event_name ? ` · ${leave.event_name}` : ''}
                </p>
              </div>
              <StatusBadge status={leave.status} />
            </div>
            {showApplicant ? (
              <p className={cx('mt-1.5 truncate text-xs font-medium text-slate-700')}>
                {leave.applicant?.full_name ?? '—'}
                {leave.applicant?.department_name ? ` · ${leave.applicant.department_name}` : ''}
              </p>
            ) : null}
            <p className="mt-1.5 text-xs text-slate-500">
              {formatDate(leave.start_date)} – {formatDate(leave.end_date)} · {daysLabel(leave)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
