import type { LeaveStatus, UserRole } from './types';

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const STATUS_STYLES: Record<LeaveStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export const STATUS_LABELS: Record<LeaveStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  student: 'bg-brand-50 text-brand-700 ring-brand-200',
  staff: 'bg-teal-50 text-teal-700 ring-teal-200',
  hod: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  principal: 'bg-purple-50 text-purple-700 ring-purple-200',
  management: 'bg-slate-800 text-white ring-slate-700',
};

export function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function fileKind(mime?: string | null, name?: string | null): 'pdf' | 'image' | 'other' {
  if (mime === 'application/pdf') return 'pdf';
  if (mime?.startsWith('image/')) return 'image';
  const ext = (name ?? '').split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return 'image';
  return 'other';
}
