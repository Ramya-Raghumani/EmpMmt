export type UserRole = 'student' | 'staff' | 'hod' | 'principal' | 'management';
export type LeaveCategory = 'regular' | 'event';
export type LeaveType = 'medical' | 'personal' | 'event' | 'duty' | 'other';
export type LeaveStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
export type DocumentType =
  | 'event_brochure'
  | 'participation_report'
  | 'participation_certificate'
  | 'event_photos'
  | 'medical_certificate'
  | 'supporting_document';

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface StudentProfile {
  roll_number: string;
  course?: string | null;
  branch?: string | null;
  year_of_study?: number | null;
  semester?: number | null;
  assigned_staff_id?: string | null;
}

export interface StaffProfile {
  employee_id: string;
  designation?: string | null;
  reporting_authority_id?: string | null;
  is_hod?: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  department_name?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  student_profile?: StudentProfile | null;
  staff_profile?: StaffProfile | null;
}

export interface LeaveDocument {
  id: string;
  leave_application_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
  /** Signed or data URL resolved at read time. */
  url?: string | null;
}

export interface ApplicantSummary {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department_name?: string | null;
  roll_number?: string | null;
  course?: string | null;
  branch?: string | null;
  year_of_study?: number | null;
  semester?: number | null;
  employee_id?: string | null;
  designation?: string | null;
  phone?: string | null;
}

export interface LeaveApplication {
  id: string;
  application_no: string;
  applicant_id: string;
  applicant_role: UserRole;
  category: LeaveCategory;
  leave_type: LeaveType;
  event_type?: string | null;
  event_name?: string | null;
  event_location?: string | null;
  start_date: string;
  end_date: string;
  total_days: number | null;
  reason: string;
  assigned_approver_id: string | null;
  status: LeaveStatus;
  approver_comments?: string | null;
  decided_at?: string | null;
  created_at: string;
  updated_at?: string;
  applicant?: ApplicantSummary | null;
  approver?: { id: string; full_name: string; role: UserRole } | null;
  documents?: LeaveDocument[];
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  kind: 'info' | 'success' | 'warning' | 'error';
  leave_application_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  full_name: string;
  role: Extract<UserRole, 'student' | 'staff'>;
  department_id: string;
  phone?: string;
  roll_number?: string;
  course?: string;
  branch?: string;
  year_of_study?: number;
  semester?: number;
  assigned_staff_id?: string;
  employee_id?: string;
  designation?: string;
}

export interface FacultyDirectoryEntry {
  id: string;
  full_name: string;
  department_id: string | null;
  department_name: string | null;
  designation: string | null;
}

export interface LeaveFilter {
  scope: 'mine' | 'approvals' | 'management';
  status?: LeaveStatus | 'all';
  category?: LeaveCategory | 'all';
  search?: string;
  department?: string;
  staffName?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateLeaveInput {
  category: LeaveCategory;
  leave_type: LeaveType;
  reason: string;
  start_date: string;
  end_date: string;
  event_type?: string;
  event_name?: string;
  event_location?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  staff: 'Staff / Faculty',
  hod: 'Head of Department',
  principal: 'Principal',
  management: 'Management',
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  medical: 'Medical Leave',
  personal: 'Personal Leave',
  event: 'Event / Activity Leave',
  duty: 'On Duty Leave',
  other: 'Other Leave',
};

export const EVENT_TYPE_OPTIONS = [
  'Hackathon',
  'Ideathon',
  'Workshop',
  'Seminar',
  'Conference',
  'Technical Symposium',
  'Cultural Fest',
  'Sports Event',
  'Industrial Visit',
  'Other College Event',
];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  event_brochure: 'Event Brochure / Invitation',
  participation_report: 'Participation Report (PDF)',
  participation_certificate: 'Participation Certificate',
  event_photos: 'Event Participation Photos',
  medical_certificate: 'Medical Certificate',
  supporting_document: 'Supporting Document',
};

/** Event leave applications cannot be submitted without all four of these. */
export const MANDATORY_EVENT_DOCUMENTS: DocumentType[] = [
  'event_brochure',
  'participation_report',
  'participation_certificate',
  'event_photos',
];

export const ACCEPTED_UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
export const ACCEPTED_UPLOAD_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
