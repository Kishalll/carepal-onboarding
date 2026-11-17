import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Button,
  Select,
  Card,
  Badge,
  useToast,
  Skeleton,
} from '@carepal/ui';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  Camera,
  RefreshCw,
  FileCheck2,
} from 'lucide-react';

interface CandidateInfo {
  id: string;
  applicationId: string;
  fullName: string;
  qualification: string;
  stage: string;
}

interface UploadedDocument {
  id: string;
  category: 'ID_PROOF' | 'CERTIFICATE' | 'PHOTO';
  idType: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
  previewUrl: string;
}

const ID_TYPE_OPTIONS = [
  { value: 'AADHAAR', label: 'Aadhaar Card (Masked recommended)' },
  { value: 'VOTER_ID', label: 'Voter Identity Card' },
  { value: 'PASSPORT', label: 'Indian Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
];

export function DocumentUploadPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { success: toastSuccess, error: toastError } = useToast();

  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form states for upload slots
  const [selectedIdType, setSelectedIdType] = useState('AADHAAR');
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Drag over states
  const [dragActiveId, setDragActiveId] = useState(false);
  const [dragActivePhoto, setDragActivePhoto] = useState(false);
  const [dragActiveCert, setDragActiveCert] = useState(false);

  // Hidden file input refs
  const idInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    if (!applicationId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/applications/${applicationId}/documents`);
      if (!res.ok) {
        if (res.status === 404) {
          setLoadError(`Application ID "${applicationId}" was not found.`);
        } else {
          setLoadError('Failed to load application documents. Please try again.');
        }
        return;
      }
      const data = await res.json();
      setCandidate(data.candidate);
      setDocuments(data.documents);
      setLoadError(null);
    } catch {
      setLoadError('Network error connecting to CarePal servers.');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Client-side pre-validation
  const validateClientFile = (file: File): string | null => {
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return `File size is ${mb} MB. Maximum allowed size is 5 MB.`;
    }
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lower.endsWith(ext));
    if (!hasValidExt) {
      return 'Only PDF, JPEG, and PNG files are allowed.';
    }
    return null;
  };

  // Perform upload
  const handleUpload = async (
    file: File,
    category: 'ID_PROOF' | 'CERTIFICATE' | 'PHOTO',
    extraIdType?: string
  ) => {
    const errorMsg = validateClientFile(file);
    if (errorMsg) {
      toastError(errorMsg);
      return;
    }

    try {
      setUploadingCategory(category);
      setUploadProgress(25);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (category === 'ID_PROOF') {
        formData.append('idType', extraIdType || selectedIdType);
      }

      setUploadProgress(60);

      const res = await fetch(`/api/applications/${applicationId}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setUploadProgress(100);

      if (!res.ok) {
        toastError(data.message || 'Upload failed.');
        return;
      }

      toastSuccess(`${file.name} uploaded successfully!`);
      await fetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      toastError('Network error during upload. Please try again.');
    } finally {
      setUploadingCategory(null);
      setUploadProgress(0);
    }
  };

  // Handle document deletion
  const handleDelete = async (docId: string, docName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${docName}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/applications/${applicationId}/documents/${docId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json();
        toastError(data.message || 'Failed to remove document.');
        return;
      }
      toastSuccess(`"${docName}" removed.`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      toastError('Failed to remove document. Please try again.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (loadError || !candidate) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-heading font-bold text-brand-heading">
          Application Not Found
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          {loadError || 'We could not locate this application. Please check the Application ID.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/careers/apply">
            <Button variant="primary" size="md">
              Start Application
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" size="md">
              Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const idDoc = documents.find((d) => d.category === 'ID_PROOF');
  const photoDoc = documents.find((d) => d.category === 'PHOTO');
  const certDocs = documents.filter((d) => d.category === 'CERTIFICATE');

  const isComplete = Boolean(idDoc && photoDoc && certDocs.length > 0);

  return (
    <div className="max-w-3xl mx-auto py-4">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-action transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Careers
        </Link>
        <button
          type="button"
          onClick={fetchDocuments}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-action"
          title="Refresh documents"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-brand-heading">
              {candidate.fullName}
            </h1>
            <Badge label={candidate.stage} variant="blue" size="sm" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Application ID:{' '}
            <span className="font-mono font-semibold text-brand-action">
              {candidate.applicationId}
            </span>{' '}
            | Qualification:{' '}
            <span className="font-semibold text-gray-700">
              {candidate.qualification.replace('_', ' ')}
            </span>
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {isComplete ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              All Requirements Uploaded
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Documents Incomplete
            </div>
          )}
        </div>
      </div>

      {/* Security notice */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5 mb-6">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Private & Encrypted Document Storage:</span>
          <p className="text-blue-800/90 mt-0.5">
            Files are stored outside the public web root in encrypted storage. Links expire automatically in 15 minutes. Supported formats: PDF, PNG, JPEG (max 5 MB per file).
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ================= SECTION 1: ID PROOF ================= */}
        <Card variant="default" className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-brand-action" />
                <h2 className="text-base font-heading font-semibold text-brand-heading">
                  1. Identity Proof
                </h2>
                <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">
                  Required
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Upload official government photo ID (Aadhaar with first 8 digits masked, Voter ID, or Passport).
              </p>
            </div>
            {idDoc && (
              <Badge label="Uploaded" variant="green" size="sm" />
            )}
          </div>

          {idDoc ? (
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-brand-action flex items-center justify-center shrink-0">
                  {idDoc.mimeType === 'application/pdf' ? (
                    <FileText className="w-5 h-5 text-red-600" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-brand-action" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-heading truncate">
                      {idDoc.originalName}
                    </span>
                    <Badge label={idDoc.idType || 'ID'} variant="neutral" size="sm" />
                  </div>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    {formatFileSize(idDoc.sizeBytes)} | Status: {idDoc.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={idDoc.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-gray-500 hover:text-brand-action hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                  title="View Document"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => idInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-brand-heading bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-w-xs">
                <Select
                  label="Document Type"
                  options={ID_TYPE_OPTIONS}
                  value={selectedIdType}
                  onChange={(e) => setSelectedIdType(e.target.value)}
                />
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActiveId(true);
                }}
                onDragLeave={() => setDragActiveId(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActiveId(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleUpload(e.dataTransfer.files[0], 'ID_PROOF', selectedIdType);
                  }
                }}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                  dragActiveId
                    ? 'border-brand-action bg-blue-50/50'
                    : 'border-gray-200 hover:border-brand-action/50 hover:bg-gray-50/50'
                }`}
                onClick={() => idInputRef.current?.click()}
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 text-brand-action flex items-center justify-center mx-auto mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-brand-heading">
                  Drag & drop your ID proof, or{' '}
                  <span className="text-brand-action hover:underline">browse files</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  PDF, PNG, JPEG up to 5 MB
                </p>
              </div>
            </div>
          )}

          <input
            ref={idInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleUpload(e.target.files[0], 'ID_PROOF', selectedIdType);
                e.target.value = '';
              }
            }}
          />
        </Card>

        {/* ================= SECTION 2: PASSPORT PHOTO ================= */}
        <Card variant="default" className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-brand-action" />
                <h2 className="text-base font-heading font-semibold text-brand-heading">
                  2. Passport Photograph
                </h2>
                <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">
                  Required
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Recent passport-size photo with clear face visibility on a neutral background.
              </p>
            </div>
            {photoDoc && (
              <Badge label="Uploaded" variant="green" size="sm" />
            )}
          </div>

          {photoDoc ? (
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 border border-gray-300 shrink-0">
                  <img
                    src={photoDoc.previewUrl}
                    alt="Passport Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-brand-heading truncate block">
                    {photoDoc.originalName}
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    {formatFileSize(photoDoc.sizeBytes)} | Status: {photoDoc.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={photoDoc.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-gray-500 hover:text-brand-action hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                  title="View Photo"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-brand-heading bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActivePhoto(true);
              }}
              onDragLeave={() => setDragActivePhoto(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActivePhoto(false);
                if (e.dataTransfer.files?.[0]) {
                  handleUpload(e.dataTransfer.files[0], 'PHOTO');
                }
              }}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                dragActivePhoto
                  ? 'border-brand-action bg-blue-50/50'
                  : 'border-gray-200 hover:border-brand-action/50 hover:bg-gray-50/50'
              }`}
              onClick={() => photoInputRef.current?.click()}
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 text-brand-action flex items-center justify-center mx-auto mb-2">
                <Camera className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-brand-heading">
                Drag & drop passport photograph, or{' '}
                <span className="text-brand-action hover:underline">browse files</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                JPEG or PNG, up to 5 MB
              </p>
            </div>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleUpload(e.target.files[0], 'PHOTO');
                e.target.value = '';
              }
            }}
          />
        </Card>

        {/* ================= SECTION 3: QUALIFICATION CERTIFICATES ================= */}
        <Card variant="default" className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-action" />
                <h2 className="text-base font-heading font-semibold text-brand-heading">
                  3. Qualification & Nursing Certificates
                </h2>
                <Badge
                  label={`${certDocs.length}/5 uploaded`}
                  variant={certDocs.length > 0 ? 'blue' : 'neutral'}
                  size="sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Upload Nursing Degree/Diploma, Council Registration certificate, or Caregiving Training completion certificates (up to 5 documents).
              </p>
            </div>
          </div>

          {/* List of uploaded certificates */}
          {certDocs.length > 0 && (
            <div className="space-y-2 mb-4">
              {certDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-brand-action flex items-center justify-center shrink-0">
                      {doc.mimeType === 'application/pdf' ? (
                        <FileText className="w-4 h-4 text-red-600" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-brand-action" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-brand-heading truncate block">
                        {doc.originalName}
                      </span>
                      <span className="text-[11px] text-gray-400 block mt-0.5">
                        {formatFileSize(doc.sizeBytes)} | Status: {doc.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={doc.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-gray-500 hover:text-brand-action hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                      title="View Certificate"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.originalName)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                      title="Delete Certificate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload dropzone if under 5 certificates */}
          {certDocs.length < 5 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActiveCert(true);
              }}
              onDragLeave={() => setDragActiveCert(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActiveCert(false);
                if (e.dataTransfer.files?.[0]) {
                  handleUpload(e.dataTransfer.files[0], 'CERTIFICATE');
                }
              }}
              className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                dragActiveCert
                  ? 'border-brand-action bg-blue-50/50'
                  : 'border-gray-200 hover:border-brand-action/50 hover:bg-gray-50/50'
              }`}
              onClick={() => certInputRef.current?.click()}
            >
              <div className="w-9 h-9 rounded-full bg-blue-50 text-brand-action flex items-center justify-center mx-auto mb-1.5">
                <UploadCloud className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-brand-heading">
                Add certificate ({5 - certDocs.length} remaining)
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                PDF, JPEG, or PNG up to 5 MB
              </p>
            </div>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
              Maximum certificate limit (5) reached. Remove an existing certificate if you need to upload a different one.
            </p>
          )}

          <input
            ref={certInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleUpload(e.target.files[0], 'CERTIFICATE');
                e.target.value = '';
              }
            }}
          />
        </Card>
      </div>

      {/* Uploading progress indicator */}
      {uploadingCategory && (
        <div className="fixed bottom-6 right-6 p-4 rounded-2xl bg-white border border-gray-200 shadow-xl max-w-sm w-full z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-heading mb-2">
            <span>Uploading document...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-brand-action transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Completion Banner */}
      <div className="mt-8 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-heading font-semibold text-brand-heading">
            Next: Verification by CarePal Clinical Operations
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Our team will review your ID and certificates against nursing council records. We will contact you via WhatsApp and email.
          </p>
        </div>
        <Link to="/">
          <Button variant="outline" size="md">
            Done & Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
