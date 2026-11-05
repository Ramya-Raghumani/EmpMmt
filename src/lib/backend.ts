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
} from './types';
import { MANDATORY_EVENT_DOCUMENTS } from './types';

export type DecisionInput = {
  decision: Extract<LeaveStatus, 'approved' | 'rejected'>;
  comments: string;
};

export interface Backend {
  /** 'supabase' when a real project is connected, 'demo' for the labelled local sandbox. */
  readonly kind: 'supabase' | 'demo';

  signIn(email: string, password: string): Promise<AppUser>;
  signUp(input: SignUpInput): Promise<{ user: AppUser | null; needsEmailConfirmation: boolean }>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AppUser | null>;
  subscribe(onChange: (user: AppUser | null) => void): () => void;

  listDepartments(): Promise<Department[]>;
  listFaculty(departmentId?: string): Promise<FacultyDirectoryEntry[]>;

  listLeaves(filter: LeaveFilter, user: AppUser): Promise<LeaveApplication[]>;
  getLeave(id: string): Promise<LeaveApplication | null>;
  createLeave(input: CreateLeaveInput, asDraft: boolean): Promise<LeaveApplication>;
  submitLeave(id: string): Promise<void>;
  decideLeave(id: string, input: DecisionInput): Promise<void>;
  cancelLeave(id: string): Promise<void>;

  uploadDocument(
    leaveId: string,
    documentType: DocumentType,
    file: File,
  ): Promise<LeaveDocument>;
  deleteDocument(documentId: string): Promise<void>;

  listNotifications(): Promise<NotificationRow[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;

  updateProfile(patch: { full_name?: string; phone?: string }): Promise<void>;
}

/** Thrown by both backends so the UI can show one consistent message. */
export class BackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendError';
  }
}

export function missingEventDocuments(documents: { document_type: DocumentType }[]): DocumentType[] {
  const present = new Set(documents.map((doc) => doc.document_type));
  return MANDATORY_EVENT_DOCUMENTS.filter((type) => !present.has(type));
}

export function scopedWhere(user: AppUser, scope: LeaveFilter['scope']): boolean {
  if (scope === 'mine') return true;
  if (scope === 'approvals') {
    return user.role === 'staff' || user.role === 'hod' || user.role === 'principal';
  }
  return user.role === 'management';
}

export function canApprove(user: AppUser, leave: LeaveApplication): boolean {
  return (
    leave.status === 'pending' &&
    leave.assigned_approver_id === user.id &&
    (user.role === 'staff' || user.role === 'hod' || user.role === 'principal')
  );
}

export function canManageOwn(user: AppUser, leave: LeaveApplication): boolean {
  return (
    leave.applicant_id === user.id && (leave.status === 'draft' || leave.status === 'pending')
  );
}
