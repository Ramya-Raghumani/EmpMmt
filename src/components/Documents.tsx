import { useEffect, useState } from 'react';
import {
  Download,
  Eye,
  FileImage,
  FileText,
  Paperclip,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { ACCEPTED_UPLOAD_EXTENSIONS, DOCUMENT_LABELS, MANDATORY_EVENT_DOCUMENTS } from '../lib/types';
import type { DocumentType, LeaveDocument } from '../lib/types';
import { fileKind, formatBytes, formatDateTime } from '../lib/format';
import { cx } from './ui';

export function DocumentPreview({ document }: { document: LeaveDocument }) {
  const [open, setOpen] = useState(false);
  const kind = fileKind(document.mime_type, document.file_name);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-3 px-3.5 py-3">
        <div className="flex min-w-0 gap-2.5">
          <span
            className={cx(
              'mt-0.5 rounded-lg p-1.5',
              kind === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600',
            )}
          >
            {kind === 'pdf' ? <FileText className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{document.file_name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {DOCUMENT_LABELS[document.document_type]} · {formatBytes(document.file_size)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
            aria-label={`Preview ${document.file_name}`}
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </button>
          {document.url ? (
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              download={document.file_name}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
              aria-label={`Download ${document.file_name}`}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className="border-t border-slate-200 bg-slate-50 p-3">
          {document.url ? (
            kind === 'image' ? (
              <img
                src={document.url}
                alt={document.file_name}
                className="mx-auto max-h-72 rounded-lg border border-slate-200 bg-white object-contain"
              />
            ) : (
              <iframe
                title={document.file_name}
                src={document.url}
                className="h-72 w-full rounded-lg border border-slate-200 bg-white"
              />
            )
          ) : (
            <p className="text-xs text-slate-500">Preview unavailable for this document.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function DocumentChecklist({ documents }: { documents: LeaveDocument[] }) {
  const present = new Set(documents.map((doc) => doc.document_type));
  return (
    <ul className="space-y-1.5">
      {MANDATORY_EVENT_DOCUMENTS.map((type) => {
        const done = present.has(type);
        return (
          <li key={type} className="flex items-center gap-2 text-sm">
            <span
              className={cx(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400',
              )}
            >
              {done ? '✓' : '•'}
            </span>
            <span className={done ? 'text-slate-700' : 'text-slate-500'}>
              {DOCUMENT_LABELS[type]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function DocumentUploader({
  documents,
  onUpload,
  onDelete,
  allowDelete,
  busyType,
  error,
}: {
  documents: LeaveDocument[];
  onUpload: (type: DocumentType, file: File) => void;
  onDelete?: (document: LeaveDocument) => void;
  allowDelete?: boolean;
  busyType?: DocumentType | null;
  error?: string | null;
}) {
  const [selected, setSelected] = useState<DocumentType>('event_brochure');
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const options: DocumentType[] = [
    ...MANDATORY_EVENT_DOCUMENTS,
    'medical_certificate',
    'supporting_document',
  ];

  const submit = () => {
    if (!file) {
      setLocalError('Choose a PDF, JPG or PNG file first.');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setLocalError('Only PDF, JPG, JPEG and PNG files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLocalError('Files must be 10 MB or smaller.');
      return;
    }
    setLocalError(null);
    onUpload(selected, file);
    setFile(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <UploadCloud className="h-4 w-4 text-brand-600" />
          Upload a supporting document
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Accepted formats: PDF, JPG, JPEG, PNG · maximum 10 MB per file.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.2fr_auto]">
          <select
            className="input"
            value={selected}
            onChange={(event) => setSelected(event.target.value as DocumentType)}
            aria-label="Document type"
          >
            {options.map((type) => (
              <option key={type} value={type}>
                {DOCUMENT_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept={ACCEPTED_UPLOAD_EXTENSIONS}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-700"
            aria-label="Choose file"
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={submit}
            disabled={busyType !== null && busyType !== undefined}
          >
            <Paperclip className="h-4 w-4" />
            {busyType ? 'Uploading…' : 'Upload'}
          </button>
        </div>
        {localError ? <p className="mt-2 text-xs font-medium text-rose-600">{localError}</p> : null}
        {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
      </div>

      <div className="space-y-2">
        {documents.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No documents uploaded yet.
          </p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <DocumentPreview document={doc} />
              </div>
              {allowDelete && onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(doc)}
                  className="btn-ghost self-start text-rose-600 hover:bg-rose-50"
                  title={`Remove ${doc.file_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Small helper that keeps the audit trail visible to reviewers. */
export function DocumentAudit({ documents }: { documents: LeaveDocument[] }) {
  if (documents.length === 0) return null;
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
      <p className="flex items-center gap-1.5 font-semibold text-slate-600">
        <ShieldCheck className="h-3.5 w-3.5 text-teal-600" /> Document audit trail
      </p>
      <ul className="mt-1.5 space-y-1">
        {documents.map((doc) => (
          <li key={doc.id}>
            {DOCUMENT_LABELS[doc.document_type]} — uploaded {formatDateTime(doc.uploaded_at)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Keeps the browser tab title in sync with the active page. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · CampusLeave`;
  }, [title]);
}
