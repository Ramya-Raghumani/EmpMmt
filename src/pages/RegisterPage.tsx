import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert, Field, cx } from '../components/ui';
import { usePageTitle } from '../components/Documents';
import { errorMessage, useAsync } from '../lib/hooks';
import { backend } from '../lib/backendInstance';
import type { SignUpInput } from '../lib/types';

type RoleChoice = 'student' | 'staff';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  usePageTitle('Create account');

  const [role, setRole] = useState<RoleChoice>('student');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm: '',
    phone: '',
    department_id: '',
    roll_number: '',
    course: '',
    branch: '',
    year_of_study: '1',
    semester: '1',
    assigned_staff_id: '',
    employee_id: '',
    designation: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const departments = useAsync(() => backend.listDepartments(), []);
  const faculty = useAsync(
    () => backend.listFaculty(form.department_id || undefined),
    [],
    form.department_id,
  );

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!form.department_id) {
      setError('Please select your department.');
      return;
    }

    const payload: SignUpInput = {
      email: form.email.trim(),
      password: form.password,
      full_name: form.full_name.trim(),
      role,
      department_id: form.department_id,
      phone: form.phone || undefined,
    };

    if (role === 'student') {
      if (!form.roll_number.trim()) {
        setError('Roll number is required for students.');
        return;
      }
      payload.roll_number = form.roll_number.trim();
      payload.course = form.course || undefined;
      payload.branch = form.branch || undefined;
      payload.year_of_study = Number(form.year_of_study) || undefined;
      payload.semester = Number(form.semester) || undefined;
      payload.assigned_staff_id = form.assigned_staff_id || undefined;
    } else {
      if (!form.employee_id.trim()) {
        setError('Employee ID is required for staff accounts.');
        return;
      }
      payload.employee_id = form.employee_id.trim();
      payload.designation = form.designation || undefined;
    }

    setBusy(true);
    try {
      const result = await signUp(payload);
      if (result.needsEmailConfirmation) {
        setNotice('Account created. Check your college email to confirm the address, then sign in.');
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-teal-500 text-white">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-900">CampusLeave</p>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Leave Portal</p>
          </div>
        </div>

        <div className="card p-5 sm:p-7">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Student and staff accounts can self-register. HOD, Principal and management accounts are
            created by the college administrator.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: 'student', label: 'Student', detail: 'Apply for leave and upload documents' },
                { value: 'staff', label: 'Staff / Faculty', detail: 'Approve student leave and apply for your own' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={cx(
                  'rounded-xl border px-4 py-3 text-left transition',
                  role === option.value
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                    : 'border-slate-200 hover:border-brand-200',
                )}
              >
                <span className="block text-sm font-bold text-slate-800">{option.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{option.detail}</span>
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {error ? <Alert tone="error">{error}</Alert> : null}
            {notice ? <Alert tone="success">{notice}</Alert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <input required className="input" value={form.full_name} onChange={set('full_name')} placeholder="Arjun Menon" />
              </Field>
              <Field label="College email" required>
                <input required type="email" className="input" value={form.email} onChange={set('email')} placeholder="you@college.edu" />
              </Field>
              <Field label="Password" hint="Minimum 8 characters" required>
                <input required type="password" minLength={8} className="input" value={form.password} onChange={set('password')} autoComplete="new-password" />
              </Field>
              <Field label="Confirm password" required>
                <input required type="password" minLength={8} className="input" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
              </Field>
              <Field label="Phone">
                <input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Department" required>
                <select required className="input" value={form.department_id} onChange={set('department_id')}>
                  <option value="">Select department</option>
                  {departments.data.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.code})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {role === 'student' ? (
              <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
                <Field label="Roll number" required>
                  <input required className="input" value={form.roll_number} onChange={set('roll_number')} placeholder="21CS001" />
                </Field>
                <Field label="Course">
                  <input className="input" value={form.course} onChange={set('course')} placeholder="B.Tech" />
                </Field>
                <Field label="Branch / Programme">
                  <input className="input" value={form.branch} onChange={set('branch')} placeholder="Computer Science" />
                </Field>
                <Field label="Year of study">
                  <select className="input" value={form.year_of_study} onChange={set('year_of_study')}>
                    {[1, 2, 3, 4].map((year) => (
                      <option key={year} value={year}>Year {year}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Semester">
                  <select className="input" value={form.semester} onChange={set('semester')}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Faculty advisor" hint="Your leave requests are routed to this staff member">
                  <select className="input" value={form.assigned_staff_id} onChange={set('assigned_staff_id')}>
                    <option value="">Auto-assign from department</option>
                    {faculty.data.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.full_name}{entry.designation ? ` · ${entry.designation}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : (
              <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
                <Field label="Employee ID" required>
                  <input required className="input" value={form.employee_id} onChange={set('employee_id')} placeholder="CSE-FAC-104" />
                </Field>
                <Field label="Designation">
                  <input className="input" value={form.designation} onChange={set('designation')} placeholder="Assistant Professor" />
                </Field>
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              <UserPlus className="h-4 w-4" />
              {busy ? 'Creating account…' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
