import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { backend } from '../lib/backendInstance';
import { initials, relativeTime } from '../lib/format';
import { useAsync, emitDataChanged } from '../lib/hooks';
import { ROLE_LABELS, type UserRole } from '../lib/types';
import { cx } from './ui';

type NavItem = { to: string; label: string; icon: ReactNode; roles: UserRole[] };

const ALL: UserRole[] = ['student', 'staff', 'hod', 'principal', 'management'];

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4.5 w-4.5" />, roles: ALL },
  { to: '/leaves', label: 'My Leaves', icon: <ClipboardList className="h-4.5 w-4.5" />, roles: ['student', 'staff', 'hod', 'principal'] },
  { to: '/leaves/new', label: 'Apply for Leave', icon: <CalendarPlus className="h-4.5 w-4.5" />, roles: ['student', 'staff', 'hod', 'principal'] },
  { to: '/approvals', label: 'Approvals', icon: <CheckCircle2 className="h-4.5 w-4.5" />, roles: ['staff', 'hod', 'principal'] },
  { to: '/records', label: 'Staff Leave Records', icon: <FileBarChart2 className="h-4.5 w-4.5" />, roles: ['management'] },
  { to: '/notifications', label: 'Notifications', icon: <Bell className="h-4.5 w-4.5" />, roles: ALL },
  { to: '/profile', label: 'Profile', icon: <UserCircle2 className="h-4.5 w-4.5" />, roles: ALL },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 text-white shadow-sm">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <div className="leading-tight">
        <p className="text-[15px] font-extrabold tracking-tight text-slate-900">CampusLeave</p>
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Leave Portal</p>
      </div>
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data } = useAsync(() => backend.listNotifications(), [], 'bell');
  const unread = data.filter((row) => !row.is_read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-800">Notifications</p>
              <button
                type="button"
                className="text-xs font-semibold text-brand-700 hover:underline"
                onClick={async () => {
                  await backend.markAllNotificationsRead();
                  emitDataChanged();
                }}
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {data.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">You are all caught up.</p>
              ) : (
                data.slice(0, 8).map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={async () => {
                      if (!row.is_read) {
                        await backend.markNotificationRead(row.id);
                        emitDataChanged();
                      }
                      setOpen(false);
                      navigate(row.leave_application_id ? `/leaves/${row.leave_application_id}` : '/notifications');
                    }}
                    className={cx(
                      'block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50',
                      !row.is_read && 'bg-brand-50/50',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cx(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          row.kind === 'success' ? 'bg-emerald-500' : row.kind === 'error' ? 'bg-rose-500' : 'bg-brand-500',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{row.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{row.message}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{relativeTime(row.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              className="w-full border-t border-slate-100 px-4 py-2.5 text-center text-xs font-semibold text-brand-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
            >
              View all notifications
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 hover:bg-slate-100"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-teal-500 text-sm font-bold text-white">
          {initials(user.full_name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[10rem] truncate text-sm font-semibold text-slate-800">{user.full_name}</span>
          <span className="block text-[11px] text-slate-500">{ROLE_LABELS[user.role]}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-bold text-slate-800">{user.full_name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                {ROLE_LABELS[user.role]}
                {user.department_name ? ` · ${user.department_name}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                navigate('/profile');
              }}
            >
              <UserCircle2 className="h-4 w-4" /> Profile settings
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
              onClick={async () => {
                setOpen(false);
                await signOut();
                navigate('/login');
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const items = useMemo(
    () => (user ? NAV.filter((item) => item.roles.includes(user.role)) : []),
    [user],
  );

  if (!user) return <>{children}</>;

  const sidebar = (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <div className="px-1">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1" aria-label="Main navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/leaves'}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
        <p className="font-semibold text-slate-600">Signed in as</p>
        <p className="truncate">{user.email}</p>
        <p className="mt-1">{ROLE_LABELS[user.role]}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="lg:hidden">
                <Brand />
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-slate-500">
                  {items.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))?.label ??
                    'CampusLeave'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationBell />
              <ProfileMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        <footer className="mx-auto w-full max-w-7xl px-4 pb-8 text-center text-xs text-slate-400 sm:px-6">
          CampusLeave · College Leave Management System
        </footer>
      </div>
    </div>
  );
}
