import {
  BackendError,
  missingEventDocuments,
  type Backend,
  type DecisionInput,
} from './backend';
import { makeDemoImage, makeDemoPdf } from './demoFiles';
import type {
  AppUser,
  CreateLeaveInput,
  Department,
  DocumentType,
  FacultyDirectoryEntry,
  LeaveApplication,
  LeaveDocument,
  LeaveFilter,
  LeaveStatus,
  NotificationRow,
  SignUpInput,
  UserRole,
} from './types';

/**
 * Local demo backend.
 *
 * Used only when the Supabase project credentials are absent. It mirrors the
 * database triggers and RLS rules in supabase/01_schema.sql so the interface can
 * be evaluated before a project is connected. Everything is stored in this
 * browser's localStorage and is clearly labelled as demo data in the UI.
 */

const STORAGE_KEY = 'campusleave.demo.v3';
const SESSION_KEY = 'campusleave.demo.session';
export const DEMO_PASSWORD = 'Passw0rd!2026';

interface DemoStaffProfile {
  employee_id: string;
  designation: string | null;
  reporting_authority_id: string | null;
  is_hod: boolean;
}

interface DemoStudentProfile {
  roll_number: string;
  course: string | null;
  branch: string | null;
  year_of_study: number | null;
  semester: number | null;
  assigned_staff_id: string | null;
}

interface DemoUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  phone: string | null;
  created_at: string;
  student_profile?: DemoStudentProfile;
  staff_profile?: DemoStaffProfile;
}

interface DemoLeave extends Omit<LeaveApplication, 'applicant' | 'approver' | 'documents'> {}

interface DemoState {
  departments: Department[];
  users: DemoUser[];
  leaves: DemoLeave[];
  documents: (LeaveDocument & { url: string | null })[];
  notifications: NotificationRow[];
  seq: number;
}

const DEPARTMENTS: Department[] = [
  { id: 'dept-cse', name: 'Computer Science and Engineering', code: 'CSE' },
  { id: 'dept-it', name: 'Information Technology', code: 'IT' },
  { id: 'dept-ece', name: 'Electronics and Communication Engineering', code: 'ECE' },
  { id: 'dept-mech', name: 'Mechanical Engineering', code: 'MECH' },
  { id: 'dept-aids', name: 'Artificial Intelligence and Data Science', code: 'AI&DS' },
  { id: 'dept-admin', name: 'Administration', code: 'ADMIN' },
];

function iso(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function now(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function baseUsers(): DemoUser[] {
  return [
    {
      id: 'user-management',
      email: 'management@college.edu',
      password: DEMO_PASSWORD,
      full_name: 'College Management',
      role: 'management',
      department_id: 'dept-admin',
      phone: '+91 90000 00005',
      created_at: now(),
      staff_profile: {
        employee_id: 'EMP-0001',
        designation: 'College Management',
        reporting_authority_id: null,
        is_hod: false,
      },
    },
    {
      id: 'user-principal',
      email: 'principal@college.edu',
      password: DEMO_PASSWORD,
      full_name: 'Dr. R. Sundaram',
      role: 'principal',
      department_id: 'dept-admin',
      phone: '+91 90000 00004',
      created_at: now(),
      staff_profile: {
        employee_id: 'EMP-1000',
        designation: 'Principal',
        reporting_authority_id: 'user-management',
        is_hod: false,
      },
    },
    {
      id: 'user-hod',
      email: 'hod.cse@college.edu',
      password: DEMO_PASSWORD,
      full_name: 'Dr. Meera Krishnan',
      role: 'hod',
      department_id: 'dept-cse',
      phone: '+91 90000 00001',
      created_at: now(),
      staff_profile: {
        employee_id: 'EMP-1001',
        designation: 'Head of Department',
        reporting_authority_id: 'user-principal',
        is_hod: true,
      },
    },
    {
      id: 'user-staff',
      email: 'staff.cse@college.edu',
      password: DEMO_PASSWORD,
      full_name: 'Prof. Anand Verma',
      role: 'staff',
      department_id: 'dept-cse',
      phone: '+91 90000 00002',
      created_at: now(),
      staff_profile: {
        employee_id: 'EMP-1002',
        designation: 'Assistant Professor',
        reporting_authority_id: 'user-hod',
        is_hod: false,
      },
    },
    {
      id: 'user-staff2',
      email: 'staff.it@college.edu',
      password: DEMO_PASSWORD,
      full_name: 'Prof. Kavya Nair',
      role: 'staff',
      department_id: 'dept-it',
      phone: '+91 90000 00003',
      created_at: now(),
      staff_profile: {
        employee_id: 'EMP-1003',
        designation: 'Assistant Professor',
        reporting_authority_id: 'user-hod',
        is_hod: false,
      },
    },
    {
      id: 'user-student1',
      email: 'student1@college.edu',
      password: DEMO_PASSWORD,
      full_name: 'Aarav Sharma',
      role: 'student',
      department_id: 'dept-cse',
      phone: '+91 90000 00011',
      created_at: now(),
      student_profile: {
        roll_number: '21CS101',
        course: 'B.E. Computer Science',
        branch: 'CSE',
        year_of_study: 3,
        semester: 6,
        assigned_staff_id: 'user-staff',
      },
    },
    {
      id: 'user-student2',
      email: 'student2@college.edu',
      password: DEMO_PASSWORD,
      full_name: 'Diya Patel',
      role: 'student',
      department_id: 'dept-cse',
      phone: '+91 90000 00012',
      created_at: now(),
      student_profile: {
        roll_number: '21CS102',
        course: 'B.E. Computer Science',
        branch: 'CSE',
        year_of_study: 3,
        semester: 6,
        assigned_staff_id: 'user-staff',
      },
    },
  ];
}

function baseState(): DemoState {
  const users = baseUsers();
  const leave = (
    id: string,
    applicantId: string,
    values: Partial<DemoLeave> & Pick<DemoLeave, 'category' | 'leave_type' | 'reason'>,
  ): DemoLeave => {
    const applicant = users.find((user) => user.id === applicantId)!;
    const based: DemoLeave = {
      id,
      application_no: 'LV-2026-0000',
      applicant_id: applicantId,
      applicant_role: applicant.role,
      category: values.category,
      leave_type: values.leave_type,
      event_type: values.event_type ?? null,
      event_name: values.event_name ?? null,
      event_location: values.event_location ?? null,
      start_date: values.start_date ?? iso(-3),
      end_date: values.end_date ?? iso(-1),
      total_days: null,
      reason: values.reason,
      assigned_approver_id: values.assigned_approver_id ?? 'user-staff',
      status: values.status ?? 'pending',
      approver_comments: values.approver_comments ?? null,
      decided_at: values.decided_at ?? null,
      created_at: values.created_at ?? now(),
      updated_at: now(),
    };
    based.total_days =
      Math.round(
        (new Date(`${based.end_date}T00:00:00`).getTime() -
          new Date(`${based.start_date}T00:00:00`).getTime()) /
          86400000,
      ) + 1;
    return based;
  };

  const leaves: DemoLeave[] = [
    leave('leave-1', 'user-student1', {
      category: 'regular',
      leave_type: 'medical',
      reason: 'Viral fever with doctor-advised bed rest for two days.',
      start_date: iso(-8),
      end_date: iso(-7),
      status: 'approved',
      approver_comments: 'Approved. Medical certificate verified. Take care and share notes from class.',
      decided_at: now(),
      created_at: iso(-10),
    }),
    leave('leave-2', 'user-student1', {
      category: 'event',
      leave_type: 'event',
      event_type: 'Hackathon',
      event_name: 'Smart India Hackathon 2026 — Grand Finale',
      event_location: 'NIT Trichy, Tiruchirappalli',
      reason: 'Selected as team lead for the 36-hour national hackathon finale representing the college.',
      start_date: iso(4),
      end_date: iso(6),
      status: 'pending',
      created_at: iso(-1),
    }),
    leave('leave-3', 'user-student2', {
      category: 'event',
      leave_type: 'event',
      event_type: 'Workshop',
      event_name: 'AI/ML Research Workshop',
      event_location: 'IIT Madras Research Park, Chennai',
      reason: 'Attending a three-day hands-on workshop on applied machine learning organised by the department.',
      start_date: iso(-20),
      end_date: iso(-18),
      status: 'rejected',
      approver_comments: 'Participation report incomplete — please resubmit with the signed report in PDF format.',
      decided_at: iso(-21),
      created_at: iso(-24),
    }),
    leave('leave-4', 'user-student2', {
      category: 'regular',
      leave_type: 'personal',
      reason: 'Family function at native place; parents have requested attendance.',
      start_date: iso(10),
      end_date: iso(11),
      status: 'pending',
      created_at: iso(-2),
    }),
    leave('leave-5', 'user-staff', {
      category: 'regular',
      leave_type: 'duty',
      reason: 'On duty for the Anna University inspection committee visit and NAAC documentation.',
      start_date: iso(-12),
      end_date: iso(-11),
      status: 'approved',
      assigned_approver_id: 'user-hod',
      approver_comments: 'Approved. Please hand over the internal exam question papers before leaving.',
      decided_at: iso(-13),
      created_at: iso(-15),
    }),
    leave('leave-6', 'user-staff2', {
      category: 'regular',
      leave_type: 'medical',
      reason: 'Scheduled dental surgery and post-operative rest as advised by the hospital.',
      start_date: iso(2),
      end_date: iso(4),
      status: 'pending',
      assigned_approver_id: 'user-hod',
      created_at: iso(-1),
    }),
  ];

  leaves.forEach((row, index) => {
    row.application_no = `LV-2026-${String(1010 + index)}`;
  });

  return {
    departments: DEPARTMENTS,
    users,
    leaves,
    documents: [],
    notifications: [
      {
        id: 'notif-1',
        user_id: 'user-student1',
        title: 'Leave approved',
        message: 'Your leave application LV-2026-1010 has been approved.',
        kind: 'success',
        leave_application_id: 'leave-1',
        is_read: false,
        created_at: iso(-6),
      },
      {
        id: 'notif-2',
        user_id: 'user-staff',
        title: 'New leave request',
        message: 'Aarav Sharma submitted LV-2026-1011 (3 day(s)) for your approval.',
        kind: 'info',
        leave_application_id: 'leave-2',
        is_read: false,
        created_at: iso(-1),
      },
      {
        id: 'notif-3',
        user_id: 'user-hod',
        title: 'New leave request',
        message: 'Prof. Kavya Nair submitted LV-2026-1015 (3 day(s)) for your approval.',
        kind: 'info',
        leave_application_id: 'leave-6',
        is_read: false,
        created_at: iso(-1),
      },
    ],
    seq: 1016,
  };
}

function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = baseState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed.users?.length) throw new Error('bad state');
    return parsed;
  } catch {
    const fresh = baseState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

function saveState(state: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toAppUser(state: DemoState, user: DemoUser): AppUser {
  const department = state.departments.find((row) => row.id === user.department_id);
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    department_id: user.department_id,
    department_name: department?.name ?? null,
    phone: user.phone,
    is_active: true,
    created_at: user.created_at,
    student_profile: user.student_profile ?? null,
    staff_profile: user.staff_profile ?? null,
  };
}

function decorate(state: DemoState, row: DemoLeave): LeaveApplication {
  const applicant = state.users.find((user) => user.id === row.applicant_id);
  const approver = state.users.find((user) => user.id === row.assigned_approver_id);
  const department = state.departments.find((dept) => dept.id === applicant?.department_id);
  return {
    ...row,
    applicant: applicant
      ? {
          id: applicant.id,
          full_name: applicant.full_name,
          email: applicant.email,
          role: applicant.role,
          department_name: department?.name ?? null,
          roll_number: applicant.student_profile?.roll_number ?? null,
          course: applicant.student_profile?.course ?? null,
          branch: applicant.student_profile?.branch ?? null,
          year_of_study: applicant.student_profile?.year_of_study ?? null,
          semester: applicant.student_profile?.semester ?? null,
          employee_id: applicant.staff_profile?.employee_id ?? null,
          designation: applicant.staff_profile?.designation ?? null,
          phone: applicant.phone,
        }
      : null,
    approver: approver
      ? { id: approver.id, full_name: approver.full_name, role: approver.role }
      : null,
    documents: state.documents
      .filter((doc) => doc.leave_application_id === row.id)
      .map(({ ...doc }) => doc as LeaveDocument),
  };
}

function resolveApprover(state: DemoState, applicant: DemoUser): string {
  if (applicant.role === 'student') {
    const staffId = applicant.student_profile?.assigned_staff_id;
    if (!staffId) {
      throw new BackendError(
        'No faculty member is assigned to your profile yet. Contact your department office.',
      );
    }
    return staffId;
  }
  const authority = applicant.staff_profile?.reporting_authority_id;
  if (authority) return authority;
  const principal = state.users.find((user) => user.role === 'principal');
  if (principal) return principal.id;
  throw new BackendError('No HOD or Principal is configured to approve staff leave.');
}

function notify(
  state: DemoState,
  userId: string,
  title: string,
  message: string,
  kind: NotificationRow['kind'],
  leaveId: string | null,
): void {
  state.notifications.unshift({
    id: makeId('notif'),
    user_id: userId,
    title,
    message,
    kind,
    leave_application_id: leaveId,
    is_read: false,
    created_at: now(),
  });
}

function matchesFilter(
  state: DemoState,
  user: DemoUser,
  row: DemoLeave,
  filter: LeaveFilter,
): boolean {
  if (filter.scope === 'mine') {
    if (row.applicant_id !== user.id) return false;
  } else if (filter.scope === 'approvals') {
    if (row.assigned_approver_id !== user.id) return false;
    if (!['staff', 'hod', 'principal'].includes(user.role)) return false;
  } else {
    // Management: staff-type leave records only, read-only.
    if (user.role !== 'management') return false;
    if (!['staff', 'hod', 'principal'].includes(row.applicant_role)) return false;
  }

  if (filter.status && filter.status !== 'all' && row.status !== filter.status) return false;
  if (filter.category && filter.category !== 'all' && row.category !== filter.category) return false;

  const applicant = state.users.find((u) => u.id === row.applicant_id);
  if (filter.search) {
    const needle = filter.search.toLowerCase();
    const haystack = [
      row.application_no,
      row.reason,
      row.event_name ?? '',
      applicant?.full_name ?? '',
      applicant?.student_profile?.roll_number ?? '',
      applicant?.staff_profile?.employee_id ?? '',
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  if (filter.staffName) {
    const needle = filter.staffName.toLowerCase();
    if (!(applicant?.full_name ?? '').toLowerCase().includes(needle)) return false;
  }
  if (filter.department && filter.department !== 'all') {
    if ((applicant?.department_id ?? '') !== filter.department) return false;
  }
  if (filter.fromDate && row.end_date < filter.fromDate) return false;
  if (filter.toDate && row.start_date > filter.toDate) return false;
  return true;
}

export function createDemoBackend(): Backend {
  let listeners: ((user: AppUser | null) => void)[] = [];

  const emit = () => {
    const current = readSession();
    listeners.forEach((listener) => listener(current));
  };

  function readSession(): AppUser | null {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const state = loadState();
    const user = state.users.find((row) => row.id === id);
    return user ? toAppUser(state, user) : null;
  }

  function requireSession(): { state: DemoState; user: DemoUser } {
    const id = localStorage.getItem(SESSION_KEY);
    const state = loadState();
    const user = state.users.find((row) => row.id === id);
    if (!user) throw new BackendError('Your session has expired. Please sign in again.');
    return { state, user };
  }

  return {
    kind: 'demo',

    async signIn(email, password) {
      const state = loadState();
      const user = state.users.find(
        (row) => row.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!user || user.password !== password) {
        throw new BackendError('Incorrect email or password. Try the demo credentials listed below.');
      }
      localStorage.setItem(SESSION_KEY, user.id);
      emit();
      return toAppUser(state, user);
    },

    async signUp(input: SignUpInput) {
      const state = loadState();
      if (state.users.some((row) => row.email.toLowerCase() === input.email.toLowerCase())) {
        throw new BackendError('An account with this email already exists.');
      }
      const id = makeId('user');
      const created: DemoUser = {
        id,
        email: input.email.trim(),
        password: input.password,
        full_name: input.full_name.trim(),
        role: input.role,
        department_id: input.department_id || null,
        phone: input.phone ?? null,
        created_at: now(),
        student_profile:
          input.role === 'student'
            ? {
                roll_number: input.roll_number?.trim() || `ROLL-${id.slice(-4).toUpperCase()}`,
                course: input.course ?? null,
                branch: input.branch ?? null,
                year_of_study: input.year_of_study ?? null,
                semester: input.semester ?? null,
                assigned_staff_id:
                  input.assigned_staff_id ??
                  state.users.find(
                    (row) =>
                      row.role === 'staff' && row.department_id === input.department_id,
                  )?.id ??
                  null,
              }
            : undefined,
        staff_profile:
          input.role === 'staff'
            ? {
                employee_id: input.employee_id?.trim() || `EMP-${id.slice(-4).toUpperCase()}`,
                designation: input.designation ?? 'Assistant Professor',
                reporting_authority_id:
                  state.users.find(
                    (row) => row.role === 'hod' && row.department_id === input.department_id,
                  )?.id ?? state.users.find((row) => row.role === 'principal')?.id ?? null,
                is_hod: false,
              }
            : undefined,
      };
      state.users.push(created);
      saveState(state);
      localStorage.setItem(SESSION_KEY, created.id);
      emit();
      return { user: toAppUser(state, created), needsEmailConfirmation: false };
    },

    async signOut() {
      localStorage.removeItem(SESSION_KEY);
      emit();
    },

    async getCurrentUser() {
      return readSession();
    },

    subscribe(onChange) {
      listeners.push(onChange);
      return () => {
        listeners = listeners.filter((listener) => listener !== onChange);
      };
    },

    async listDepartments() {
      return loadState().departments;
    },

    async listFaculty(departmentId?: string) {
      const state = loadState();
      return state.users
        .filter((row) => row.role === 'staff' && (!departmentId || row.department_id === departmentId))
        .map<FacultyDirectoryEntry>((row) => ({
          id: row.id,
          full_name: row.full_name,
          department_id: row.department_id,
          department_name:
            state.departments.find((dept) => dept.id === row.department_id)?.name ?? null,
          designation: row.staff_profile?.designation ?? null,
        }));
    },

    async listLeaves(filter, appUser) {
      const state = loadState();
      const user = state.users.find((row) => row.id === appUser.id);
      if (!user) return [];
      return state.leaves
        .filter((row) => matchesFilter(state, user, row, filter))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((row) => decorate(state, row));
    },

    async getLeave(id) {
      const state = loadState();
      const row = state.leaves.find((leave) => leave.id === id);
      return row ? decorate(state, row) : null;
    },

    async createLeave(input: CreateLeaveInput, asDraft: boolean) {
      const { state, user } = requireSession();
      if (user.role === 'management') {
        throw new BackendError('Management accounts cannot create leave applications.');
      }
      const id = makeId('leave');
      const approver = resolveApprover(state, user);
      const totalDays =
        Math.round(
          (new Date(`${input.end_date}T00:00:00`).getTime() -
            new Date(`${input.start_date}T00:00:00`).getTime()) /
            86400000,
        ) + 1;

      const row: DemoLeave = {
        id,
        application_no: `LV-${new Date().getFullYear()}-${state.seq}`,
        applicant_id: user.id,
        applicant_role: user.role,
        category: input.category,
        leave_type: input.leave_type,
        event_type: input.event_type ?? null,
        event_name: input.event_name ?? null,
        event_location: input.event_location ?? null,
        start_date: input.start_date,
        end_date: input.end_date,
        total_days: totalDays,
        reason: input.reason.trim(),
        assigned_approver_id: approver,
        status: asDraft ? 'draft' : 'pending',
        approver_comments: null,
        decided_at: null,
        created_at: now(),
        updated_at: now(),
      };
      state.seq += 1;
      state.leaves.unshift(row);

      if (!asDraft) {
        if (row.category === 'event') {
          throw new BackendError(
            'Event leave requires the brochure, participation report (PDF), certificate and event photos. Save as draft, upload them, then submit.',
          );
        }
        notify(
          state,
          approver,
          'New leave request',
          `${user.full_name} submitted ${row.application_no} (${totalDays} day(s)) for your approval.`,
          'info',
          id,
        );
      }
      saveState(state);
      return decorate(state, row);
    },

    async submitLeave(id) {
      const { state, user } = requireSession();
      const row = state.leaves.find((leave) => leave.id === id);
      if (!row) throw new BackendError('Leave application not found.');
      if (row.applicant_id !== user.id) throw new BackendError('You can only submit your own leave.');
      if (row.status !== 'draft') throw new BackendError('Only a draft can be submitted.');
      if (row.category === 'event') {
        const docs = state.documents.filter((doc) => doc.leave_application_id === id);
        const missing = missingEventDocuments(docs);
        if (missing.length > 0) {
          throw new BackendError(
            `Upload all four mandatory event documents before submitting (${missing.length} missing).`,
          );
        }
      }
      row.status = 'pending';
      row.updated_at = now();
      notify(
        state,
        row.assigned_approver_id ?? '',
        'New leave request',
        `${user.full_name} submitted ${row.application_no} (${row.total_days} day(s)) for your approval.`,
        'info',
        id,
      );
      saveState(state);
    },

    async decideLeave(id, input: DecisionInput) {
      const { state, user } = requireSession();
      const row = state.leaves.find((leave) => leave.id === id);
      if (!row) throw new BackendError('Leave application not found.');
      if (row.assigned_approver_id !== user.id) {
        throw new BackendError('Only the assigned approver can decide on this application.');
      }
      if (!['staff', 'hod', 'principal'].includes(user.role)) {
        throw new BackendError('Your role cannot approve leave applications.');
      }
      if (row.status !== 'pending') throw new BackendError('This application has already been decided.');
      if (input.decision === 'rejected' && input.comments.trim().length < 4) {
        throw new BackendError('Please add a reason when rejecting a leave application.');
      }
      row.status = input.decision;
      row.approver_comments = input.comments.trim() || null;
      row.decided_at = now();
      row.updated_at = now();
      notify(
        state,
        row.applicant_id,
        `Leave ${input.decision}`,
        `Your leave application ${row.application_no} has been ${input.decision}.`,
        input.decision === 'approved' ? 'success' : 'error',
        id,
      );
      saveState(state);
    },

    async cancelLeave(id) {
      const { state, user } = requireSession();
      const row = state.leaves.find((leave) => leave.id === id);
      if (!row) throw new BackendError('Leave application not found.');
      if (row.applicant_id !== user.id) throw new BackendError('You can only cancel your own leave.');
      if (!['pending', 'draft'].includes(row.status)) {
        throw new BackendError('A decided application cannot be cancelled.');
      }
      row.status = 'cancelled' as LeaveStatus;
      row.updated_at = now();
      saveState(state);
    },

    async uploadDocument(leaveId, documentType, file) {
      const { state, user } = requireSession();
      const row = state.leaves.find((leave) => leave.id === leaveId);
      if (!row) throw new BackendError('Leave application not found.');
      if (row.applicant_id !== user.id) throw new BackendError('You can only upload to your own leave.');
      if (!['draft', 'pending'].includes(row.status)) {
        throw new BackendError('Documents cannot be added to a decided application.');
      }
      if (state.documents.some((doc) => doc.leave_application_id === leaveId && doc.document_type === documentType)) {
        throw new BackendError('That document type is already uploaded. Remove it first to replace it.');
      }
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new BackendError('Could not read the selected file.'));
        reader.readAsDataURL(file);
      });
      const document: LeaveDocument & { url: string | null } = {
        id: makeId('doc'),
        leave_application_id: leaveId,
        document_type: documentType,
        file_name: file.name,
        file_path: `demo/${user.id}/${leaveId}/${documentType}-${file.name}`,
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: now(),
        url,
      };
      state.documents.push(document);
      saveState(state);
      return document;
    },

    async deleteDocument(documentId) {
      const { state, user } = requireSession();
      const doc = state.documents.find((row) => row.id === documentId);
      if (!doc) throw new BackendError('Document not found.');
      const leave = state.leaves.find((row) => row.id === doc.leave_application_id);
      if (!leave || leave.applicant_id !== user.id) {
        throw new BackendError('You can only remove your own documents.');
      }
      if (leave.status !== 'draft') {
        throw new BackendError('Documents can only be removed while the application is a draft.');
      }
      state.documents = state.documents.filter((row) => row.id !== documentId);
      saveState(state);
    },

    async listNotifications() {
      const { state, user } = requireSession();
      return state.notifications
        .filter((row) => row.user_id === user.id)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },

    async markNotificationRead(id) {
      const { state, user } = requireSession();
      const row = state.notifications.find((item) => item.id === id && item.user_id === user.id);
      if (row) row.is_read = true;
      saveState(state);
    },

    async markAllNotificationsRead() {
      const { state, user } = requireSession();
      state.notifications.forEach((row) => {
        if (row.user_id === user.id) row.is_read = true;
      });
      saveState(state);
    },

    async updateProfile(patch) {
      const { state, user } = requireSession();
      if (patch.full_name !== undefined) user.full_name = patch.full_name.trim();
      if (patch.phone !== undefined) user.phone = patch.phone.trim() || null;
      saveState(state);
      emit();
    },
  };
}

/** Builds the four mandatory event documents so the demo flow can be completed. */
export async function seedDemoEventDocuments(
  backend: Backend,
  leaveId: string,
  eventName: string,
): Promise<void> {
  const pdfs: { type: DocumentType; name: string; title: string; lines: string[] }[] = [
    {
      type: 'event_brochure',
      name: 'event-brochure.pdf',
      title: 'Event Brochure',
      lines: [eventName, 'Organised by the host institution', 'Demo document generated in the sandbox'],
    },
    {
      type: 'participation_report',
      name: 'participation-report.pdf',
      title: 'Participation Report',
      lines: [eventName, 'Participant report submitted by the student', 'Demo document generated in the sandbox'],
    },
    {
      type: 'participation_certificate',
      name: 'participation-certificate.pdf',
      title: 'Certificate of Participation',
      lines: [eventName, 'This is to certify active participation', 'Demo document generated in the sandbox'],
    },
  ];

  for (const item of pdfs) {
    const url = makeDemoPdf(item.title, item.lines);
    const response = await fetch(url);
    const blob = await response.blob();
    await backend.uploadDocument(leaveId, item.type, new File([blob], item.name, { type: 'application/pdf' }));
  }

  const imageUrl = makeDemoImage('Event Photos', eventName);
  const imageResponse = await fetch(imageUrl);
  const imageBlob = await imageResponse.blob();
  await backend.uploadDocument(
    leaveId,
    'event_photos',
    new File([imageBlob], 'event-photos.png', { type: 'image/png' }),
  );
}
