import { Link } from 'react-router-dom';
import {
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Clock4,
  FileBarChart2,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { backend } from '../lib/backendInstance';
import { useAsync } from '../lib/hooks';
import { LeaveTable } from '../components/LeaveTable';
import { PageHeader, RoleBadge, Spinner, SummaryCard, Alert } from '../components/ui';
import { usePageTitle } from '../components/Documents';
import { formatDate, todayISO } from '../lib/format';
import { LEAVE_TYPE_LABELS } from '../lib/types';

export function DashboardPage() {
  const { user, demoMode } = useAuth();
  usePageTitle('Dashboard');

  const isManagement = user?.role === 'management';
  const canApproveStudent = user?.role === 'staff' || user?.role === 'hod';

  const mine = useAsync(
    () => backend.listLeaves({ scope: 'mine' }, user!),
    [],
    user?.id ?? '',
  );
  const approvals = useAsync(
    () => backend.listLeaves({ scope: 'approvals' }, user!),
    [],
    `approvals-${user?.id ?? ''}`,
  );
  const management = useAsync(
    () => backend.listLeaves({ scope: 'management' }, user!),
    [],
    `management-${user?.id ?? ''}`,
  );

  if (!user) return <Spinner />;

  const myLeaves = mine.data;
  const queue = approvals.data;
  const records = management.data;

  const pending = myLeaves.filter((row) => row.status === 'pending').length;
  const approved = myLeaves.filter((row) => row.status === 'approved').length;
  const rejected = myLeaves.filter((row) => row.status === 'rejected').length;
  const draftCount = myLeaves.filter((row) => row.status === 'draft').length;
  const awaiting = queue.filter((row) => row.status === 'pending');
  const upcoming = myLeaves
    .filter((row) => row.status === 'approved' && row.end_date >= todayISO())
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))[0];

  const greeting = user.full_name.split(' ')[0] || 'there';

  if (isManagement) {
    const pendingStaff = records.filter((row) => row.status === 'pending').length;
    const approvedStaff = records.filter((row) => row.status === 'approved').length;
    const rejectedStaff = records.filter((row) => row.status === 'rejected').length;
    const departments = new Set(records.map((row) => row.applicant?.department_name ?? 'Unassigned'));

    return (
      <div>
        <PageHeader
          title={`Management overview`}
          description="Read-only view of all staff leave records across departments."
        >
          <Link to="/records" className="btn-primary">
            <FileBarChart2 className="h-4 w-4" /> Open reports
          </Link>
        </PageHeader>

        {demoMode ? (
          <div className="mb-5">
            <Alert tone="info">
              Demo mode — sample data lives in this browser. Connect Supabase for live records.
            </Alert>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Staff applications" value={records.length} icon={<ClipboardList className="h-5 w-5" />} tone="brand" />
          <SummaryCard label="Pending" value={pendingStaff} icon={<Clock4 className="h-5 w-5" />} tone="amber" hint="Awaiting HOD / Principal" />
          <SummaryCard label="Approved" value={approvedStaff} icon={<CheckCircle2 className="h-5 w-5" />} tone="teal" />
          <SummaryCard label="Rejected" value={rejectedStaff} icon={<XCircle className="h-5 w-5" />} tone="rose" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="card overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Latest staff leave records</h2>
              <Link to="/records" className="text-xs font-semibold text-brand-700 hover:underline">
                View all
              </Link>
            </div>
            <LeaveTable
              leaves={records.slice(0, 6)}
              showApplicant
              emptyTitle="No staff leave records"
              emptyDescription="Staff leave applications will appear here once submitted."
            />
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Departments reporting</h2>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">{departments.size}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
              {[...departments].slice(0, 8).map((name) => (
                <li key={name} className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-brand-500" /> {name}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
              Management access is read-only: approvals and edits must be done by the assigned HOD or Principal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${greeting}`}
        description={
          user.role === 'student'
            ? 'Track your leave applications and submit new requests.'
            : user.role === 'staff'
              ? 'Review student leave requests assigned to you and manage your own leave.'
              : 'Review staff leave requests routed to you from your department.'
        }
      >
        <div className="flex flex-wrap gap-2">
          <Link to="/leaves/new" className="btn-primary">
            <CalendarPlus className="h-4 w-4" /> Apply for leave
          </Link>
          {canApproveStudent || user.role === 'principal' ? (
            <Link to="/approvals" className="btn-secondary">
              <CheckCircle2 className="h-4 w-4" /> Approvals
              {awaiting.length > 0 ? (
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-700">
                  {awaiting.length}
                </span>
              ) : null}
            </Link>
          ) : null}
        </div>
      </PageHeader>

      {demoMode ? (
        <div className="mb-5">
          <Alert tone="info">
            Demo mode — accounts and data are stored in this browser. Connect a Supabase project to use real
            authentication, database and storage.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total applications"
          value={myLeaves.length}
          hint={`${draftCount} draft${draftCount === 1 ? '' : 's'}`}
          icon={<ClipboardList className="h-5 w-5" />}
          tone="brand"
        />
        <SummaryCard label="Pending" value={pending} hint="Awaiting approval" icon={<Clock4 className="h-5 w-5" />} tone="amber" />
        <SummaryCard label="Approved" value={approved} hint="This academic year" icon={<CheckCircle2 className="h-5 w-5" />} tone="teal" />
        <SummaryCard label="Rejected" value={rejected} hint="Check approver comments" icon={<XCircle className="h-5 w-5" />} tone="rose" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(canApproveStudent || user.role === 'principal') && awaiting.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Awaiting your decision</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {user.role === 'staff' ? 'Student leave requests assigned to you' : 'Staff leave requests routed to you'}
                  </p>
                </div>
                <Link to="/approvals" className="text-xs font-semibold text-brand-700 hover:underline">
                  Open queue
                </Link>
              </div>
              <LeaveTable
                leaves={awaiting.slice(0, 5)}
                showApplicant
                emptyTitle="Nothing awaiting your decision"
                emptyDescription="New requests will appear here automatically."
              />
            </div>
          ) : null}

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">My recent leave applications</h2>
              <Link to="/leaves" className="text-xs font-semibold text-brand-700 hover:underline">
                View history
              </Link>
            </div>
            {mine.loading ? (
              <Spinner label="Loading applications…" />
            ) : mine.error ? (
              <div className="p-5">
                <Alert tone="error">{mine.error}</Alert>
              </div>
            ) : (
              <LeaveTable
                leaves={myLeaves.slice(0, 6)}
                emptyTitle="No leave applications yet"
                emptyDescription="Start a request and it will show up here with live status."
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <CalendarCheck2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{user.full_name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <RoleBadge role={user.role} />
              {user.department_name ? <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">{user.department_name}</span> : null}
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              {user.roll_number ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Roll number</dt>
                  <dd className="font-semibold text-slate-700">{user.student_profile?.roll_number}</dd>
                </div>
              ) : null}
              {user.staff_profile?.employee_id ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Employee ID</dt>
                  <dd className="font-semibold text-slate-700">{user.staff_profile.employee_id}</dd>
                </div>
              ) : null}
              {user.staff_profile?.designation ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Designation</dt>
                  <dd className="text-right font-semibold text-slate-700">{user.staff_profile.designation}</dd>
                </div>
              ) : null}
              {user.student_profile?.semester ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Semester</dt>
                  <dd className="font-semibold text-slate-700">{user.student_profile.semester}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <CalendarClock className="h-4 w-4 text-teal-600" /> Upcoming approved leave
            </div>
            {upcoming ? (
              <div className="mt-3 rounded-xl bg-teal-50 px-4 py-3 text-sm">
                <p className="font-semibold text-teal-900">{LEAVE_TYPE_LABELS[upcoming.leave_type]}</p>
                <p className="mt-0.5 text-xs text-teal-800">
                  {formatDate(upcoming.start_date)} – {formatDate(upcoming.end_date)} · {upcoming.total_days} day(s)
                </p>
                <Link to={`/leaves/${upcoming.id}`} className="mt-2 inline-block text-xs font-semibold text-teal-800 underline">
                  View application {upcoming.application_no}
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No upcoming approved leave on record.</p>
            )}
          </div>

          {draftCount > 0 ? (
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
                <ShieldAlert className="h-4 w-4" /> {draftCount} draft{draftCount === 1 ? '' : 's'} need attention
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Event leave drafts can be submitted once all four mandatory documents are uploaded.
              </p>
              <Link to="/leaves?status=draft" className="mt-3 inline-block text-xs font-semibold text-brand-700 hover:underline">
                Finish draft applications
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
