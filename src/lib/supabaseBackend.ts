import { BackendError, type Backend, type DecisionInput } from './backend';
import { DOCUMENT_BUCKET, requireClient } from './supabase';
import type {
  AppUser,
  CreateLeaveInput,
  Department,
  DocumentType,
  FacultyDirectoryEntry,
  LeaveApplication,
  LeaveDocument,
  LeaveFilter,
  NotificationRow,
  SignUpInput,
} from './types';

/**
 * Supabase adapter.
 *
 * All authorisation is enforced by Row Level Security in supabase/01_schema.sql;
 * this module only shapes queries and payloads for the React UI. It never
 * decides access on the client alone.
 */

type Row = Record<string, unknown>;

function one<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

function fail(message: string, error: { message?: string } | null): never {
  throw new BackendError(error?.message ? `${message}: ${error.message}` : message);
}

const USER_SELECT =
  'id, email, full_name, role, department_id, phone, is_active, created_at, ' +
  'department:departments(name), student_profiles(*), staff_profiles(*)';

function toAppUser(row: Row): AppUser {
  const studentProfile = one<AppUser['student_profile']>(row.student_profiles);
  const staffProfile = one<AppUser['staff_profile']>(row.staff_profiles);
  const department = one<{ name: string }>(row.department);
  return {
    id: String(row.id),
    email: String(row.email),
    full_name: String(row.full_name),
    role: row.role as AppUser['role'],
    department_id: (row.department_id as string | null) ?? null,
    department_name: department?.name ?? null,
    phone: (row.phone as string | null) ?? null,
    is_active: row.is_active !== false,
    created_at: String(row.created_at),
    student_profile: studentProfile
      ? {
          roll_number: studentProfile.roll_number,
          course: studentProfile.course ?? null,
          branch: studentProfile.branch ?? null,
          year_of_study: studentProfile.year_of_study ?? null,
          semester: studentProfile.semester ?? null,
          assigned_staff_id: studentProfile.assigned_staff_id ?? null,
        }
      : null,
    staff_profile: staffProfile
      ? {
          employee_id: staffProfile.employee_id,
          designation: staffProfile.designation ?? null,
          reporting_authority_id: staffProfile.reporting_authority_id ?? null,
          is_hod: staffProfile.is_hod ?? false,
        }
      : null,
  };
}

function decorateLeave(
  row: Row,
  applicants: Map<string, AppUser>,
  approvers: Map<string, { id: string; full_name: string; role: AppUser['role'] }>,
  documents: LeaveDocument[],
): LeaveApplication {
  const applicant = applicants.get(String(row.applicant_id)) ?? null;
  return {
    id: String(row.id),
    application_no: String(row.application_no),
    applicant_id: String(row.applicant_id),
    applicant_role: row.applicant_role as LeaveApplication['applicant_role'],
    category: row.category as LeaveApplication['category'],
    leave_type: row.leave_type as LeaveApplication['leave_type'],
    event_type: (row.event_type as string | null) ?? null,
    event_name: (row.event_name as string | null) ?? null,
    event_location: (row.event_location as string | null) ?? null,
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    total_days: (row.total_days as number | null) ?? null,
    reason: String(row.reason),
    assigned_approver_id: (row.assigned_approver_id as string | null) ?? null,
    status: row.status as LeaveApplication['status'],
    approver_comments: (row.approver_comments as string | null) ?? null,
    decided_at: (row.decided_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: (row.updated_at as string | null) ?? null,
    applicant: applicant
      ? {
          id: applicant.id,
          full_name: applicant.full_name,
          email: applicant.email,
          role: applicant.role,
          department_name: applicant.department_name ?? null,
          roll_number: applicant.student_profile?.roll_number ?? null,
          course: applicant.student_profile?.course ?? null,
          branch: applicant.student_profile?.branch ?? null,
          year_of_study: applicant.student_profile?.year_of_study ?? null,
          semester: applicant.student_profile?.semester ?? null,
          employee_id: applicant.staff_profile?.employee_id ?? null,
          designation: applicant.staff_profile?.designation ?? null,
          phone: applicant.phone ?? null,
        }
      : null,
    approver: approvers.get(String(row.assigned_approver_id)) ?? null,
    documents: documents.filter((doc) => doc.leave_application_id === String(row.id)),
  };
}

export function createSupabaseBackend(): Backend {
  const client = () => requireClient();

  async function fetchProfile(userId: string): Promise<AppUser | null> {
    const { data, error } = await client()
      .from('users')
      .select(USER_SELECT)
      .eq('id', userId)
      .maybeSingle();
    if (error) fail('Could not load your profile', error);
    return data ? toAppUser(data as Row) : null;
  }

  async function fetchUsers(ids: string[]): Promise<Map<string, AppUser>> {
    const unique = [...new Set(ids.filter(Boolean))];
    const map = new Map<string, AppUser>();
    if (unique.length === 0) return map;
    const { data, error } = await client().from('users').select(USER_SELECT).in('id', unique);
    if (error) return map;
    (data ?? []).forEach((row) => {
      const user = toAppUser(row as Row);
      map.set(user.id, user);
    });
    return map;
  }

  async function signedUrl(path: string): Promise<string | null> {
    const { data } = await client().storage.from(DOCUMENT_BUCKET).createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  }

  async function fetchDocuments(leaveIds: string[]): Promise<LeaveDocument[]> {
    if (leaveIds.length === 0) return [];
    const { data, error } = await client()
      .from('leave_documents')
      .select('*')
      .in('leave_application_id', leaveIds);
    if (error) return [];
    return Promise.all(
      (data ?? []).map(async (row) => {
        const doc = row as Row;
        return {
          id: String(doc.id),
          leave_application_id: String(doc.leave_application_id),
          document_type: doc.document_type as DocumentType,
          file_name: String(doc.file_name),
          file_path: String(doc.file_path),
          file_size: (doc.file_size as number | null) ?? null,
          mime_type: (doc.mime_type as string | null) ?? null,
          uploaded_at: String(doc.uploaded_at),
          url: await signedUrl(String(doc.file_path)),
        } satisfies LeaveDocument;
      }),
    );
  }

  async function hydrate(rows: Row[]): Promise<LeaveApplication[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => String(row.id));
    const [applicants, approvers, documents] = await Promise.all([
      fetchUsers(rows.map((row) => String(row.applicant_id))),
      fetchUsers(rows.map((row) => String(row.assigned_approver_id ?? ''))),
      fetchDocuments(ids),
    ]);
    const approverMap = new Map(
      [...approvers.values()].map((user) => [
        user.id,
        { id: user.id, full_name: user.full_name, role: user.role },
      ]),
    );
    return rows.map((row) => decorateLeave(row, applicants, approverMap, documents));
  }

  return {
    kind: 'supabase',

    async signIn(email, password) {
      const { data, error } = await client().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) fail('Sign in failed', error);
      const user = data.user ? await fetchProfile(data.user.id) : null;
      if (!user) {
        throw new BackendError(
          'Your account exists but has no profile record yet. Ask management to provision it.',
        );
      }
      if (!user.is_active) throw new BackendError('This account has been deactivated.');
      return user;
    },

    async signUp(input: SignUpInput) {
      const meta: Record<string, string | number> = {
        full_name: input.full_name.trim(),
        role: input.role,
        department_id: input.department_id,
        phone: input.phone ?? '',
      };
      if (input.role === 'student') {
        meta.roll_number = input.roll_number?.trim() ?? '';
        meta.course = input.course ?? '';
        meta.branch = input.branch ?? '';
        if (input.year_of_study) meta.year_of_study = input.year_of_study;
        if (input.semester) meta.semester = input.semester;
        if (input.assigned_staff_id) meta.assigned_staff_id = input.assigned_staff_id;
      } else {
        meta.employee_id = input.employee_id?.trim() ?? '';
        meta.designation = input.designation ?? '';
      }

      const { data, error } = await client().auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: { data: meta },
      });
      if (error) fail('Registration failed', error);
      const needsEmailConfirmation = !data.session;
      if (!data.user) return { user: null, needsEmailConfirmation };
      const user = needsEmailConfirmation ? null : await fetchProfile(data.user.id);
      return { user, needsEmailConfirmation: needsEmailConfirmation || !user };
    },

    async signOut() {
      await client().auth.signOut();
    },

    async getCurrentUser() {
      const { data } = await client().auth.getUser();
      if (!data.user) return null;
      return fetchProfile(data.user.id);
    },

    subscribe(onChange) {
      const { data } = client().auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          onChange(null);
          return;
        }
        void fetchProfile(session.user.id)
          .then((user) => onChange(user))
          .catch(() => onChange(null));
      });
      return () => data.subscription.unsubscribe();
    },

    async listDepartments() {
      const { data, error } = await client()
        .from('departments')
        .select('id, name, code')
        .order('name');
      if (error) fail('Could not load departments', error);
      return (data ?? []) as Department[];
    },

    async listFaculty(departmentId?: string) {
      let query = client()
        .from('users')
        .select('id, full_name, department_id, staff_profiles(designation), departments(name)')
        .eq('role', 'staff');
      if (departmentId) query = query.eq('department_id', departmentId);
      const { data, error } = await query;
      if (error) return [];
      return (data ?? []).map((row) => {
        const record = row as Row;
        return {
          id: String(record.id),
          full_name: String(record.full_name),
          department_id: (record.department_id as string | null) ?? null,
          department_name: one<{ name: string }>(record.departments)?.name ?? null,
          designation: one<{ designation: string | null }>(record.staff_profiles)?.designation ?? null,
        } satisfies FacultyDirectoryEntry;
      });
    },

    async listLeaves(filter: LeaveFilter, user) {
      let query = client()
        .from('leave_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter.scope === 'mine') {
        query = query.eq('applicant_id', user.id);
      } else if (filter.scope === 'approvals') {
        query = query.eq('assigned_approver_id', user.id);
      } else {
        query = query.in('applicant_role', ['staff', 'hod', 'principal']);
      }

      if (filter.status && filter.status !== 'all') query = query.eq('status', filter.status);
      if (filter.category && filter.category !== 'all') query = query.eq('category', filter.category);
      if (filter.fromDate) query = query.gte('end_date', filter.fromDate);
      if (filter.toDate) query = query.lte('start_date', filter.toDate);
      if (filter.search) {
        const term = `%${filter.search.trim()}%`;
        query = query.or(`application_no.ilike.${term},reason.ilike.${term},event_name.ilike.${term}`);
      }

      const { data, error } = await query.limit(300);
      if (error) fail('Could not load leave applications', error);
      const rows = await hydrate((data ?? []) as Row[]);

      let result = rows;
      if (filter.department && filter.department !== 'all') {
        result = result.filter((row) => row.applicant?.department_name === filter.department);
      }
      if (filter.staffName) {
        const needle = filter.staffName.toLowerCase();
        result = result.filter((row) =>
          (row.applicant?.full_name ?? '').toLowerCase().includes(needle),
        );
      }
      return result;
    },

    async getLeave(id) {
      const { data, error } = await client()
        .from('leave_applications')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) fail('Could not load the leave application', error);
      if (!data) return null;
      const [row] = await hydrate([data as Row]);
      return row ?? null;
    },

    async createLeave(input: CreateLeaveInput, asDraft) {
      const current = await this.getCurrentUser();
      if (!current) throw new BackendError('Please sign in again.');
      const { data, error } = await client()
        .from('leave_applications')
        .insert({
          applicant_id: current.id,
          applicant_role: current.role,
          category: input.category,
          leave_type: input.leave_type,
          event_type: input.event_type ?? null,
          event_name: input.event_name ?? null,
          event_location: input.event_location ?? null,
          start_date: input.start_date,
          end_date: input.end_date,
          reason: input.reason.trim(),
          status: asDraft ? 'draft' : 'pending',
        })
        .select('*')
        .single();
      if (error) fail('Could not create the leave application', error);
      const [row] = await hydrate([data as Row]);
      if (!row) throw new BackendError('The leave application could not be loaded.');
      return row;
    },

    async submitLeave(id) {
      const leave = await this.getLeave(id);
      if (!leave) throw new BackendError('Leave application not found.');
      const { error } = await client()
        .from('leave_applications')
        .update({ status: 'pending' })
        .eq('id', id);
      if (error) fail('Could not submit the leave application', error);
    },

    async decideLeave(id, input: DecisionInput) {
      const { error } = await client()
        .from('leave_applications')
        .update({
          status: input.decision,
          approver_comments: input.comments.trim() || null,
        })
        .eq('id', id);
      if (error) fail('Could not record the decision', error);
    },

    async cancelLeave(id) {
      const { error } = await client()
        .from('leave_applications')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) fail('Could not cancel the leave application', error);
    },

    async uploadDocument(leaveId: string, documentType, file: File) {
      const current = await this.getCurrentUser();
      if (!current) throw new BackendError('Please sign in again.');
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${current.id}/${leaveId}/${documentType}-${Date.now()}-${safeName}`;
      const upload = await client().storage.from(DOCUMENT_BUCKET).upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (upload.error) fail('Upload failed', upload.error);
      const { data, error } = await client()
        .from('leave_documents')
        .insert({
          leave_application_id: leaveId,
          document_type: documentType,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: current.id,
        })
        .select('*')
        .single();
      if (error) fail('Could not save the document record', error);
      const doc = data as Row;
      return {
        id: String(doc.id),
        leave_application_id: String(doc.leave_application_id),
        document_type: doc.document_type as DocumentType,
        file_name: String(doc.file_name),
        file_path: String(doc.file_path),
        file_size: (doc.file_size as number | null) ?? null,
        mime_type: (doc.mime_type as string | null) ?? null,
        uploaded_at: String(doc.uploaded_at),
        url: await signedUrl(path),
      } satisfies LeaveDocument;
    },

    async deleteDocument(documentId) {
      const { data, error } = await client()
        .from('leave_documents')
        .select('file_path')
        .eq('id', documentId)
        .maybeSingle();
      if (error) fail('Could not load the document', error);
      const path = (data as { file_path?: string } | null)?.file_path;
      if (path) await client().storage.from(DOCUMENT_BUCKET).remove([path]);
      const removed = await client().from('leave_documents').delete().eq('id', documentId);
      if (removed.error) fail('Could not delete the document', removed.error);
    },

    async listNotifications() {
      const { data, error } = await client()
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return [];
      return (data ?? []) as NotificationRow[];
    },

    async markNotificationRead(id) {
      await client().from('notifications').update({ is_read: true }).eq('id', id);
    },

    async markAllNotificationsRead() {
      const current = await this.getCurrentUser();
      if (!current) return;
      await client().from('notifications').update({ is_read: true }).eq('user_id', current.id);
    },

    async updateProfile(patch) {
      const current = await this.getCurrentUser();
      if (!current) throw new BackendError('Please sign in again.');
      const { error } = await client()
        .from('users')
        .update({ full_name: patch.full_name, phone: patch.phone })
        .eq('id', current.id);
      if (error) fail('Could not update your profile', error);
    },
  };
}

export { missingEventDocuments };
