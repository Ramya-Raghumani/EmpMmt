import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarPlus, CheckCircle2, Info, Send, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { backend } from '../lib/backendInstance';
import { errorMessage, emitDataChanged } from '../lib/hooks';
import { usePageTitle } from '../components/Documents';
import { Alert, Field, PageHeader, Spinner, StatusBadge, cx } from '../components/ui';
import { daysBetween, todayISO } from '../lib/format';
import {
  EVENT_TYPE_OPTIONS,
  LEAVE_TYPE_LABELS,
  MANDATORY_EVENT_DOCUMENTS,
  DOCUMENT_LABELS,
  type DocumentType,
  type LeaveApplication,
  type LeaveType,
} from '../lib/types';

const REGULAR_TYPES: LeaveType[] = ['medical', 'personal', 'duty', 'other'];
const EVENT_TYPES_FOR_STAFF: LeaveType[] = ['duty', 'other', 'personal'];

export function ApplyLeavePage() {
  const { user, demoMode } = useAuth();
  const navigate = useNavigate();
  usePageTitle('Apply for leave');

  const [category, setCategory] = useState<'regular' | 'event'>('regular');
  const [leaveType, setLeaveType] = useState<LeaveType>('medical');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPE_OPTIONS[0]);
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  const [draft, setDraft] = useState<LeaveApplication | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyDoc, setBusyDoc] = useState<DocumentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [stayOnPage, setStayOnPage] = useState(true);

  const isStudent = user?.role === 'student';
  const totalDays = daysBetween(startDate, endDate);

  const availableTypes = useMemo<LeaveType[]>(
    () => (isStudent ? ['medical', 'personal', 'event'] : EVENT_TYPES_FOR_STAFF),
    [isStudent],
  );

  useEffect(() => {
    if (!availableTypes.includes(leaveType)) setLeaveType(availableTypes[0]);
  }, [availableTypes, leaveType]);

  useEffect(() => {
    if (leaveType === 'event') setCategory('event');
    else if (category === 'event') setCategory('regular');
  }, [leaveType, category]);

  const uploadedTypes = new Set((draft?.documents ?? []).map((doc) => doc.document_type));
  const missingDocs = MANDATORY_EVENT_DOCUMENTS.filter((type) => !uploadedTypes.has(type));
  const eventDocsReady = leaveType !== 'event' || missingDocs.length === 0;

  if (!user) return null;

  const validate = (): string | null => {
    if (!startDate || !endDate) return 'Choose both a start and an end date.';
    if (endDate < startDate) return 'The end date cannot be before the start date.';
    if (reason.trim().length < 10) return 'Please describe the reason in at least 10 characters.';
    if (leaveType === 'event') {
      if (!eventName.trim()) return 'Enter the event name.';
      if (!eventLocation.trim()) return 'Enter the event location.';
    }
    return null;
  };

  const createDraft = async (): Promise<LeaveApplication | null> => {
    if (draft) return draft;
    const input = {
      category: leaveType === 'event' ? ('event' as const) : ('regular' as const),
      leave_type: leaveType,
      reason: reason.trim(),
      start_date: startDate,
      end_date: endDate,
      event_type: leaveType === 'event' ? eventType : undefined,
      event_name: leaveType === 'event' ? eventName.trim() : undefined,
      event_location: leaveType === 'event' ? eventLocation.trim() : undefined,
    };
    const created = await backend.createLeave(input, true);
    setDraft(created);
    emitDataChanged();
    return created;
  };

  const handleSaveDraft = async () => {
    setError(null);
    if (!startDate || !endDate || reason.trim().length < 4) {
      setError('Add dates and a short reason before saving a draft.');
      return;
    }
    setBusy(true);
    try {
      const created = await createDraft();
      if (created && !stayOnPage) navigate(`/leaves/${created.id}`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (type: DocumentType, file: File) => {
    setDocError(null);
    setBusyDoc(type);
    try {
      const target = draft ?? (await createDraft());
      if (!target) throw new Error('Could not prepare the application for upload.');
      await backend.uploadDocument(target.id, type, file);
      const refreshed = await backend.getLeave(target.id);
      if (refreshed) setDraft(refreshed);
      emitDataChanged();
    } catch (cause) {
      setDocError(errorMessage(cause));
    } finally {
      setBusyDoc(null);
    }
  };

  const handleRemoveDoc = async (documentId: string) => {
    setDocError(null);
    try {
      await backend.deleteDocument(documentId);
      if (draft) {
        const refreshed = await backend.getLeave(draft.id);
        if (refreshed) setDraft(refreshed);
      }
      emitDataChanged();
    } catch (cause) {
      setDocError(errorMessage(cause));
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    if (leaveType === 'event' && missingDocs.length > 0) {
      setError(
        `Upload all mandatory event documents before submitting: ${missingDocs
          .map((type) => DOCUMENT_LABELS[type])
          .join(', ')}.`,
      );
      return;
    }
    setBusy(true);
    try {
      const target = await createDraft();
      if (!target) return;
      await backend.submitLeave(target.id);
      emitDataChanged();
      navigate(`/leaves/${target.id}`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Apply for leave"
        description={
          isStudent
            ? 'Regular medical/personal leave, or event leave with mandatory documentation.'
            : 'Submit a staff leave request — it is routed to your HOD or Principal.'
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {error ? (
            <Alert tone="error">
              <span className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </span>
            </Alert>
          ) : null}

          <section className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Leave type</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLeaveType(type)}
                  className={cx(
                    'rounded-xl border p-3 text-left transition',
                    leaveType === type
                      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                      : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50',
                  )}
                >
                  <p className="text-sm font-bold text-slate-800">{LEAVE_TYPE_LABELS[type]}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {type === 'medical'
                      ? 'Illness, hospitalisation, recovery'
                      : type === 'personal'
                        ? 'Family or personal obligations'
                        : type === 'event'
                          ? 'Hackathon, workshop, seminar'
                          : type === 'duty'
                            ? 'Official duty outside campus'
                            : 'Any other documented reason'}
                  </p>
                </button>
              ))}
            </div>

            {leaveType === 'event' ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                <p className="font-bold">Event leave requires four mandatory documents</p>
                <p className="mt-1">
                  Event brochure/invitation, participation report (PDF), participation certificate and event photos.
                  You can save a draft and upload them below — submission is blocked until all four are present.
                </p>
              </div>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Dates &amp; reason</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Start date" required>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    if (endDate < event.target.value) setEndDate(event.target.value);
                  }}
                />
              </Field>
              <Field label="End date" required>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </Field>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Info className="h-3.5 w-3.5" />
              {totalDays > 0 ? `${totalDays} day${totalDays === 1 ? '' : 's'} of leave` : 'End date must be on or after the start date'}
            </p>

            {leaveType === 'event' ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Event type" required>
                  <select className="input" value={eventType} onChange={(event) => setEventType(event.target.value)}>
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Event name" required>
                  <input
                    className="input"
                    placeholder="e.g. National Level Hackathon 2026"
                    value={eventName}
                    onChange={(event) => setEventName(event.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Event location" required>
                    <input
                      className="input"
                      placeholder="e.g. Anna University, Chennai"
                      value={eventLocation}
                      onChange={(event) => setEventLocation(event.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <Field label="Reason" required hint="Minimum 10 characters. Approvers read this first.">
                <textarea
                  className="input min-h-[110px]"
                  placeholder={
                    leaveType === 'medical'
                      ? 'Describe the medical reason and any treatment details…'
                      : 'Explain why you need this leave…'
                  }
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </Field>
            </div>
          </section>

          {(leaveType === 'event' || isStudent) ? (
            <section className="card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
                  Supporting documents
                </h2>
                {draft ? <StatusBadge status={draft.status} /> : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                PDF, JPG, JPEG and PNG up to 10 MB each. Uploads are attached to application{' '}
                {draft ? draft.application_no : '(draft created on first upload)'}.
              </p>

              {leaveType === 'event' ? (
                <div className="mt-3">
                  <ul className="space-y-1.5">
                    {MANDATORY_EVENT_DOCUMENTS.map((type) => {
                      const done = uploadedTypes.has(type);
                      return (
                        <li key={type} className="flex items-center gap-2 text-sm">
                          <span
                            className={cx(
                              'grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold',
                              done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400',
                            )}
                          >
                            {done ? '✓' : '•'}
                          </span>
                          <span className={done ? 'text-slate-700' : 'text-slate-500'}>
                            {DOCUMENT_LABELS[type]}
                          </span>
                          {!done ? <span className="text-[11px] font-semibold text-rose-600">required</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                <DocumentUploaderInline
                  documents={draft?.documents ?? []}
                  onUpload={handleUpload}
                  onDelete={handleRemoveDoc}
                  busyType={busyDoc}
                  error={docError}
                  allowEventTypes={leaveType === 'event'}
                />
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={handleSubmit} disabled={busy}>
              {busy ? <Spinner label="" /> : <Send className="h-4 w-4" />}
              Submit for approval
            </button>
            <button type="button" className="btn-secondary" onClick={handleSaveDraft} disabled={busy}>
              <Save className="h-4 w-4" /> Save as draft
            </button>
            <button type="button" className="btn-ghost" onClick={() => navigate('/leaves')}>
              Cancel
            </button>
          </div>
          {!eventDocsReady ? (
            <p className="text-xs font-semibold text-rose-600">
              {missingDocs.length} mandatory document{missingDocs.length === 1 ? '' : 's'} still missing — submission is disabled.
            </p>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Routing preview</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {user.role === 'student' ? (
                <>
                  Your student leave request will be routed to your assigned faculty member
                  {user.department_name ? ` in ${user.department_name}` : ''} for first-level approval.
                </>
              ) : user.role === 'staff' ? (
                <>Your staff leave request goes directly to your department HOD — never to the student approval queue.</>
              ) : user.role === 'hod' ? (
                <>Your leave request is routed to the Principal for approval.</>
              ) : (
                <>Your leave request is routed to the Principal.</>
              )}
            </p>
            <ol className="mt-3 space-y-2 text-xs text-slate-500">
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">1</span>
                Draft created with your details
              </li>
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">2</span>
                Documents attached {leaveType === 'event' ? '(all four mandatory)' : '(optional)'}
              </li>
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700">3</span>
                Approver notified, status becomes Pending
              </li>
            </ol>
          </div>

          <div className="card p-5 text-xs leading-relaxed text-slate-500">
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-teal-600" /> Policy notes
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Apply at least 24 hours before the leave starts when possible.</li>
              <li>Medical leave longer than 3 days should include a medical certificate.</li>
              <li>Event leave is only approved with complete documentation.</li>
            </ul>
          </div>

          {demoMode ? (
            <Alert tone="info">
              Demo mode: uploads are stored in this browser so you can preview PDFs and images immediately.
            </Alert>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DocumentUploaderInline({
  documents,
  onUpload,
  onDelete,
  busyType,
  error,
  allowEventTypes,
}: {
  documents: LeaveApplication['documents'];
  onUpload: (type: DocumentType, file: File) => void;
  onDelete: (documentId: string) => void;
  busyType: DocumentType | null;
  error: string | null;
  allowEventTypes: boolean;
}) {
  const { DocumentUploader } = require('../components/Documents') as typeof import('../components/Documents');
  const types: DocumentType[] = allowEventTypes
    ? [...MANDATORY_EVENT_DOCUMENTS, 'medical_certificate', 'supporting_document']
    : ['medical_certificate', 'supporting_document'];

  return (
    <DocumentUploader
      documents={documents ?? []}
      onUpload={onUpload}
      onDelete={(doc) => onDelete(doc.id)}
      allowDelete
      busyType={busyType}
      error={error}
      options={types}
    />
  );
}

export { CalendarPlus };
