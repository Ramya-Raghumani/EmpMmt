import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Info, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert, cx } from '../components/ui';
import { usePageTitle } from '../components/Documents';
import { errorMessage } from '../lib/hooks';
import { DEMO_PASSWORD } from '../lib/demoBackend';

const DEMO_ACCOUNTS = [
  { email: 'student1@college.edu', label: 'Student', detail: 'Arjun Menon · CSE' },
  { email: 'student2@college.edu', label: 'Student', detail: 'Divya Raghavan · IT' },
  { email: 'staff.cse@college.edu', label: 'Staff / Faculty', detail: 'Dr. Priya Nair · CSE' },
  { email: 'hod.cse@college.edu', label: 'HOD', detail: 'Dr. Suresh Kumar · CSE' },
  { email: 'principal@college.edu', label: 'Principal', detail: 'Dr. Meenakshi Iyer' },
  { email: 'management@college.edu', label: 'Management', detail: 'Read-only reports' },
];

export function LoginPage() {
  const { signIn, demoMode } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  usePageTitle('Sign in');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const useDemo = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-teal-600 p-12 text-white lg:flex">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-teal-400/20" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-tight">CampusLeave</p>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">Leave Portal</p>
            </div>
          </div>
          <h1 className="mt-14 max-w-md text-4xl font-extrabold leading-tight">
            College leave management, end to end.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">
            Students apply with mandatory event documentation, faculty approve with full context,
            HODs and the Principal handle staff leave, and management keeps a read-only view of every record.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            {[
              'Role-based access control for all five roles',
              'Mandatory brochure, report, certificate and photos for event leave',
              'Live status tracking with in-app notifications',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">
          Built with React, TypeScript, Tailwind CSS and Supabase.
        </p>
      </div>

      <div className="flex items-center justify-center bg-white px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-teal-500 text-white">
              <ShieldCheck className="h-6 w-6" />
            </span>
          </div>
          <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 lg:mt-0">
            Sign in to your account
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Use your college email address to continue.
          </p>

          {demoMode ? (
            <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-800">
              <p className="flex items-center gap-1.5 font-bold">
                <Info className="h-3.5 w-3.5" /> Demo mode — Supabase not connected
              </p>
              <p className="mt-1 leading-relaxed">
                Data is stored in this browser only. Connect a Supabase project
                (<code className="rounded bg-white/70 px-1">VITE_SUPABASE_URL</code>,{' '}
                <code className="rounded bg-white/70 px-1">VITE_SUPABASE_ANON_KEY</code>) to use real
                authentication and storage.
              </p>
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <label className="block">
              <span className="label">College email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@college.edu"
                  className="input pl-9"
                />
              </div>
            </label>
            <label className="block">
              <span className="label">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="input pl-9"
                />
              </div>
            </label>
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            New student or staff member?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:underline">
              Create an account
            </Link>
          </p>

          {demoMode ? (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Demo accounts · password {DEMO_PASSWORD}
              </p>
              <div className="mt-2 grid gap-1.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => useDemo(account.email)}
                    className={cx(
                      'flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition',
                      email === account.email
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-slate-200 hover:border-brand-200 hover:bg-brand-50/50',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-800">{account.email}</span>
                      <span className="block truncate text-slate-500">{account.detail}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-semibold text-brand-700 ring-1 ring-brand-100">
                      {account.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
