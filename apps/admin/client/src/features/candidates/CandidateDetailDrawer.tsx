import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Briefcase,
  Award,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  XCircle,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Undo2,
  Copy,
} from 'lucide-react';
import { Badge, Button, Card } from '@carepal/ui';

type StageType = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'VERIFIED' | 'ONBOARDED' | 'REJECTED';

interface DocumentItem {
  id: string;
  category: string;
  idType?: string | null;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
  viewUrl: string;
}

interface ChecklistItem {
  id: string;
  code: string;
  label: string;
  required: boolean;
  status: string;
  remark?: string | null;
  updatedBy?: string | null;
  updatedAt: string;
}

interface StageHistoryItem {
  id: string;
  fromStage: string;
  toStage: string;
  reasonNote?: string | null;
  createdAt: string;
  changedBy: {
    name: string;
    email: string;
  };
}

interface NoteItem {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    email: string;
  };
}

export interface EmailLogItem {
  id: string;
  recipientEmail: string;
  stage: string;
  subject: string;
  status: string;
  error?: string | null;
  sentAt: string;
}

export interface CandidateDetail {
  id: string;
  applicationId: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  city: string;
  preferredLanguage: string;
  qualification: string;
  councilRegistrationNumber?: string | null;
  experienceYears: number;
  previousWorkNote?: string | null;
  skills: string[];
  languages: string[];
  preferredCities: string[];
  availabilityType: string;
  earliestStartDate: string;
  stage: string;
  stageUpdatedAt: string;
  daysInStage: number;
  createdAt: string;
  documents: DocumentItem[];
  checklistItems: ChecklistItem[];
  notes: NoteItem[];
  stageHistory: StageHistoryItem[];
  emailLogs?: EmailLogItem[];
  isDuplicate?: boolean;
  duplicateMatch?: {
    pairId: string;
    reason: string;
    reasonText: string;
    otherCandidate: {
      id: string;
      applicationId: string;
      fullName: string;
    };
  } | null;
}

interface CandidateDetailDrawerProps {
  candidateId: string | null;
  initialTab?: 'profile' | 'documents' | 'checklist' | 'timeline' | 'emails';
  onClose: () => void;
  onCandidateUpdated?: () => void;
}

interface ActionModalState {
  type: 'checklist' | 'document';
  targetId: string;
  targetTitle: string;
  action: 'REJECTED' | 'REUPLOAD_REQUESTED';
}

export const CandidateDetailDrawer: React.FC<CandidateDetailDrawerProps> = ({
  candidateId,
  initialTab = 'profile',
  onClose,
  onCandidateUpdated,
}) => {
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'documents' | 'checklist' | 'timeline' | 'emails'
  >(initialTab);

  // Email resending state
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);
  const [emailFeedback, setEmailFeedback] = useState<{ message: string; isError: boolean } | null>(
    null
  );

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Add note form state
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  // Verification action modal state
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [actionRemark, setActionRemark] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [candidateId, initialTab]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !candidate) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCandidate({
          ...candidate,
          notes: [data.note, ...candidate.notes],
        });
        setNewNoteContent('');
      }
    } catch (err) {
      console.error('Failed to post note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleResendEmail = async (emailId: string) => {
    if (!candidate) return;
    setResendingEmailId(emailId);
    setEmailFeedback(null);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/emails/${emailId}/resend`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailFeedback({ message: 'Email resent successfully.', isError: false });
        if (data.emailLogs) {
          setCandidate((prev) => (prev ? { ...prev, emailLogs: data.emailLogs } : null));
        }
      } else {
        setEmailFeedback({
          message: data.error || data.message || 'Failed to resend email.',
          isError: true,
        });
      }
    } catch (err: unknown) {
      setEmailFeedback({
        message: err instanceof Error ? err.message : 'Network error while resending email.',
        isError: true,
      });
    } finally {
      setResendingEmailId(null);
    }
  };

  const handleUpdateChecklistItem = async (
    itemId: string,
    status: 'VERIFIED' | 'REJECTED' | 'REUPLOAD_REQUESTED' | 'PENDING',
    remark?: string
  ) => {
    if (!candidate) return;
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, remark }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update checklist item');
      }
      const data = await res.json();
      setCandidate({
        ...candidate,
        checklistItems: candidate.checklistItems.map((item) =>
          item.id === itemId ? { ...item, ...data.checklistItem } : item
        ),
      });
      onCandidateUpdated?.();
    } catch (err: unknown) {
      alert((err as Error).message || 'Error updating checklist item');
    }
  };

  const handleUpdateDocumentStatus = async (
    docId: string,
    status: 'VERIFIED' | 'REJECTED' | 'REUPLOAD_REQUESTED' | 'PENDING',
    remark?: string
  ) => {
    if (!candidate) return;
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/documents/${docId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, remark }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update document status');
      }
      const data = await res.json();
      setCandidate({
        ...candidate,
        documents: candidate.documents.map((d) =>
          d.id === docId ? { ...d, ...data.document } : d
        ),
      });
      if (previewDoc && previewDoc.id === docId) {
        setPreviewDoc({ ...previewDoc, status: data.document.status });
      }
      onCandidateUpdated?.();
    } catch (err: unknown) {
      alert((err as Error).message || 'Error updating document status');
    }
  };

  useEffect(() => {
    if (!candidateId) {
      setCandidate(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/candidates/${candidateId}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Candidate details could not be loaded');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setCandidate(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load candidate');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [candidateId]);

  if (!candidateId) return null;

  const formatQualification = (q: string) => {
    switch (q) {
      case 'B_SC_NURSING':
        return 'B.Sc Nursing';
      case 'GNM':
        return 'GNM';
      case 'ANM':
        return 'ANM';
      case 'TRAINED_CAREGIVER':
        return 'Trained Caregiver';
      default:
        return q;
    }
  };

  const formatAvailability = (a: string) => {
    return a.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCleanPhone = (phone: string) => {
    return phone.replace(/[^0-9]/g, '');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-white/10 text-brand-periwinkle font-medium">
                  {candidate?.applicationId || candidateId}
                </span>
                {candidate && (
                  <span className="text-xs text-slate-400">
                    Applied on {new Date(candidate.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-heading font-bold text-white mt-1.5">
                {candidate?.fullName || 'Loading candidate...'}
              </h2>
              {candidate && (
                <div className="flex items-center gap-3 mt-2">
                  <Badge label={candidate.stage} stage={candidate.stage as StageType} size="sm" />
                  <span className="text-xs text-slate-300 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-teal" /> {candidate.city}
                  </span>
                  <span className="text-xs text-slate-400">
                    {candidate.daysInStage} {candidate.daysInStage === 1 ? 'day' : 'days'} in current stage
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Contact Bar */}
          {candidate && (
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Quick Communication:</span>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${candidate.phone}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-brand-action hover:border-brand-action font-medium transition-colors shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5 text-green-600" />
                  <span>Call ({candidate.phone})</span>
                </a>
                <a
                  href={`https://wa.me/${getCleanPhone(candidate.phone)}?text=${encodeURIComponent(
                    `Hello ${candidate.fullName}, greetings from TheCarePal onboarding team.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-medium transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`mailto:${candidate.email}?subject=${encodeURIComponent(
                    `TheCarePal Application Update [${candidate.applicationId}]`
                  )}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-brand-action hover:border-brand-action font-medium transition-colors shadow-2xs"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Email</span>
                </a>
              </div>
            </div>
          )}

          {/* Duplicate Warning Banner */}
          {candidate?.duplicateMatch && (
            <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Possible Duplicate:</strong> {candidate.duplicateMatch.reasonText} with candidate <strong>{candidate.duplicateMatch.otherCandidate.fullName}</strong> ({candidate.duplicateMatch.otherCandidate.applicationId}).
                </span>
              </div>
              <a
                href="/duplicates"
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1"
              >
                <Copy className="w-3 h-3 text-amber-700" />
                <span>Review Duplicate</span>
              </a>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 px-6 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-brand-action text-brand-action'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Profile Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'border-brand-action text-brand-action'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>Documents</span>
              {candidate && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                  {candidate.documents.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'checklist'
                  ? 'border-brand-action text-brand-action'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>Checklist</span>
              {candidate && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                  {candidate.checklistItems.filter((i) => i.status === 'VERIFIED').length}/
                  {candidate.checklistItems.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'timeline'
                  ? 'border-brand-action text-brand-action'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Timeline & Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('emails')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'emails'
                  ? 'border-brand-action text-brand-action'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>Emails</span>
              {candidate && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                  {candidate.emailLogs?.length || 0}
                </span>
              )}
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
            {loading && (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-3 border-brand-action border-t-transparent rounded-full animate-spin"></div>
                <div className="mt-2 text-xs text-gray-500">Loading candidate record...</div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {candidate && !loading && (
              <>
                {/* Profile Tab Content */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    {/* Professional Info Card */}
                    <Card padding="md" variant="white">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-brand-action" /> Professional Credentials
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-xs text-gray-400 block">Qualification</span>
                          <span className="font-semibold text-slate-800">
                            {formatQualification(candidate.qualification)}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Experience</span>
                          <span className="font-semibold text-slate-800">
                            {candidate.experienceYears} {candidate.experienceYears === 1 ? 'Year' : 'Years'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Council Registration</span>
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            {candidate.councilRegistrationNumber || 'Not applicable / not provided'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Preferred Work Mode</span>
                          <span className="font-semibold text-slate-800">
                            {formatAvailability(candidate.availabilityType)}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Earliest Start Date</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(candidate.earliestStartDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Preferred Cities</span>
                          <span className="font-semibold text-slate-800">
                            {candidate.preferredCities.join(', ') || candidate.city}
                          </span>
                        </div>
                      </div>
                    </Card>

                    {/* Skills & Languages */}
                    <Card padding="md" variant="white">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Skills & Specialties
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {candidate.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-1 rounded-pill bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Language Proficiency
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.languages.map((lang) => (
                          <span
                            key={lang}
                            className="px-2.5 py-1 rounded-pill bg-teal-50 text-teal-800 text-xs font-medium border border-teal-200"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </Card>

                    {/* Work Background Note */}
                    {candidate.previousWorkNote && (
                      <Card padding="md" variant="white">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-gray-500" /> Background Summary
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                          {candidate.previousWorkNote}
                        </p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Documents Tab Content */}
                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Submitted Verification Documents ({candidate.documents.length})
                      </h3>
                      <span className="text-xs text-gray-400">
                        HMAC-signed 15 minute secure preview
                      </span>
                    </div>

                    {candidate.documents.length === 0 ? (
                      <div className="py-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <div className="text-sm font-semibold text-gray-600">No documents uploaded yet</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Applicant has not submitted proof documents.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {candidate.documents.map((doc) => {
                          const isPdf = doc.mimeType === 'application/pdf';
                          const categoryTitle =
                            doc.category === 'ID_PROOF'
                              ? 'Identity Proof'
                              : doc.category === 'CERTIFICATE'
                              ? 'Qualification Certificate'
                              : 'Candidate Photograph';

                          return (
                            <div
                              key={doc.id}
                              className="p-4 rounded-xl bg-white border border-gray-200 flex items-center justify-between gap-4 shadow-2xs hover:border-gray-300 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                                  {isPdf ? (
                                    <FileText className="w-5 h-5 text-red-500" />
                                  ) : (
                                    <ImageIcon className="w-5 h-5 text-blue-500" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <span className="truncate">{categoryTitle}</span>
                                    {doc.idType && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                        {doc.idType}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                                    <span className="truncate max-w-[180px]">{doc.originalName}</span>
                                    <span>•</span>
                                    <span>{formatBytes(doc.sizeBytes)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-pill ${
                                    doc.status === 'VERIFIED'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : doc.status === 'REJECTED'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : doc.status === 'REUPLOAD_REQUESTED'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {doc.status.replace('_', ' ')}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewDoc(doc);
                                    setZoomLevel(1);
                                  }}
                                  className="text-xs py-1 px-2.5 h-8 gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </Button>
                                {doc.status !== 'VERIFIED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDocumentStatus(doc.id, 'VERIFIED')}
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                    title="Verify Document"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {doc.status !== 'REJECTED' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActionModal({
                                        type: 'document',
                                        targetId: doc.id,
                                        targetTitle: `${categoryTitle} (${doc.originalName})`,
                                        action: 'REJECTED',
                                      })
                                    }
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                                    title="Reject Document"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <a
                                  href={doc.viewUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                                  title="Open in new tab"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Verification Checklist Tab Content */}
                {activeTab === 'checklist' && (
                  <div className="space-y-4">
                    {/* Progress & Gate Callout Card */}
                    <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Verification Progress
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {candidate.checklistItems.filter((i) => i.status === 'VERIFIED').length} of{' '}
                          {candidate.checklistItems.length} verified
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                          style={{
                            width: `${
                              candidate.checklistItems.length > 0
                                ? Math.round(
                                    (candidate.checklistItems.filter((i) => i.status === 'VERIFIED').length /
                                      candidate.checklistItems.length) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      {/* Stage Gate Status Indicator */}
                      {candidate.checklistItems.filter((i) => i.required).every((i) => i.status === 'VERIFIED') ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>All required checks verified. Candidate satisfies the gate to advance to Verified stage.</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Stage Gate: Candidate cannot advance to Verified until all required (*) items are verified.</span>
                        </div>
                      )}
                    </div>

                    {/* Checklist Items */}
                    <div className="space-y-3">
                      {candidate.checklistItems.map((item) => {
                        const isVerified = item.status === 'VERIFIED';
                        const isRejected = item.status === 'REJECTED';
                        const isReupload = item.status === 'REUPLOAD_REQUESTED';

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-xl bg-white border transition-all ${
                              isVerified
                                ? 'border-emerald-200 bg-emerald-50/20'
                                : isRejected
                                ? 'border-rose-200 bg-rose-50/20'
                                : isReupload
                                ? 'border-purple-200 bg-purple-50/20'
                                : 'border-gray-200 hover:border-gray-300'
                            } shadow-2xs`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <div className="mt-0.5">
                                  {isVerified ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : isRejected ? (
                                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                                  ) : isReupload ? (
                                    <RefreshCw className="w-4 h-4 text-purple-600" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-500" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                    <span>{item.label}</span>
                                    {item.required && (
                                      <span className="text-xs text-rose-500 font-bold" title="Required for Verified stage">
                                        *
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-400 font-mono mt-0.5">
                                    Code: {item.code} {item.updatedBy && `• Last updated by ${item.updatedBy}`}
                                  </div>
                                  {item.remark && (
                                    <div className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium">
                                      Remark: {item.remark}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-pill shrink-0 ${
                                  isVerified
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : isRejected
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : isReupload
                                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {item.status.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                              {!isVerified && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateChecklistItem(item.id, 'VERIFIED')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Verify</span>
                                </button>
                              )}
                              {!isRejected && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActionModal({
                                      type: 'checklist',
                                      targetId: item.id,
                                      targetTitle: item.label,
                                      action: 'REJECTED',
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              )}
                              {!isReupload && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActionModal({
                                      type: 'checklist',
                                      targetId: item.id,
                                      targetTitle: item.label,
                                      action: 'REUPLOAD_REQUESTED',
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 transition-colors"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Request Re-upload</span>
                                </button>
                              )}
                              {(isVerified || isRejected || isReupload) && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateChecklistItem(item.id, 'PENDING')}
                                  className="px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 flex items-center gap-1 transition-colors"
                                  title="Reset to Pending"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                  <span>Reset</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Timeline & Notes Tab Content */}
                {activeTab === 'timeline' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                        Candidate Stage History
                      </h3>
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {candidate.stageHistory.map((history) => (
                          <div key={history.id} className="relative">
                            <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-action border-2 border-white ring-2 ring-slate-100"></div>
                            <div className="text-xs text-slate-500">
                              {new Date(history.createdAt).toLocaleString()}
                            </div>
                            <div className="text-sm font-semibold text-slate-800 mt-0.5">
                              Moved from <span className="font-mono text-xs">{history.fromStage}</span> to{' '}
                              <span className="font-mono text-xs text-brand-action">{history.toStage}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              By {history.changedBy.name}
                            </div>
                            {history.reasonNote && (
                              <div className="mt-1.5 p-2 rounded bg-white border border-slate-200 text-xs text-slate-600">
                                {history.reasonNote}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Internal Notes */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                        Staff Notes ({candidate.notes.length})
                      </h3>

                      {/* Add Note Input Form */}
                      <form onSubmit={handleAddNote} className="mb-4">
                        <textarea
                          rows={2}
                          value={newNoteContent}
                          onChange={(e) => setNewNoteContent(e.target.value)}
                          placeholder="Type an internal note about this candidate..."
                          className="w-full p-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-action/20 focus:border-brand-action transition-all resize-none shadow-2xs"
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isSubmittingNote || !newNoteContent.trim()}
                            className="text-xs py-1.5 px-3 h-8 shadow-2xs"
                          >
                            {isSubmittingNote ? 'Saving...' : 'Add Note'}
                          </Button>
                        </div>
                      </form>

                      {candidate.notes.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">No notes entered yet.</div>
                      ) : (
                        <div className="space-y-2.5">
                          {candidate.notes.map((note) => (
                            <div key={note.id} className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                <span className="font-semibold text-slate-700">{note.author.name}</span>
                                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-slate-600 whitespace-pre-line">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Emails & Communication Tab */}
                {activeTab === 'emails' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Automated Stage Notifications ({candidate.emailLogs?.length || 0})
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Delivery records for candidate status emails sent in their preferred language ({candidate.preferredLanguage}).
                        </p>
                      </div>
                    </div>

                    {emailFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
                          emailFeedback.isError
                            ? 'bg-rose-50 border border-rose-200 text-rose-700'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        }`}
                      >
                        <span>{emailFeedback.message}</span>
                        <button
                          type="button"
                          onClick={() => setEmailFeedback(null)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {!candidate.emailLogs || candidate.emailLogs.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
                        <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-medium text-slate-600">No email records found</p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                          Emails are automatically dispatched when candidate stage changes occur, or when application is submitted.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {candidate.emailLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-4 bg-white rounded-xl border border-gray-200/80 shadow-2xs space-y-2.5 transition-all hover:border-slate-300"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      log.status === 'SENT'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {log.status}
                                  </span>
                                  <Badge label={log.stage} stage={log.stage as StageType} size="sm" />
                                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {new Date(log.sentAt).toLocaleString()}
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold text-slate-900 truncate" title={log.subject}>
                                  {log.subject}
                                </h4>
                                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <span>To:</span>
                                  <span className="font-mono text-slate-700">{log.recipientEmail}</span>
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={resendingEmailId === log.id}
                                onClick={() => handleResendEmail(log.id)}
                                className="text-xs h-8 px-3 shrink-0 gap-1.5 text-slate-700 hover:text-brand-action hover:border-brand-action"
                                title="Resend notification email"
                              >
                                <RefreshCw
                                  className={`w-3.5 h-3.5 ${
                                    resendingEmailId === log.id ? 'animate-spin text-brand-action' : ''
                                  }`}
                                />
                                <span>{resendingEmailId === log.id ? 'Resending...' : 'Resend'}</span>
                              </Button>
                            </div>

                            {log.error && (
                              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-700 flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                <span>Error: {log.error}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-teal" />
                  <span>{previewDoc.originalName}</span>
                </h4>
                <div className="text-xs text-slate-400 mt-0.5">
                  Type: {previewDoc.mimeType} | Size: {formatBytes(previewDoc.sizeBytes)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc.mimeType.startsWith('image/') && (
                  <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 mr-2">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs px-1 text-slate-200 font-mono">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <a
                  href={previewDoc.viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[450px]">
              {previewDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewDoc.viewUrl}
                  title="PDF Preview"
                  className="w-full h-[650px] rounded-lg border border-gray-300 bg-white"
                />
              ) : previewDoc.mimeType.startsWith('image/') ? (
                <div className="overflow-auto max-h-[70vh] flex items-center justify-center">
                  <img
                    src={previewDoc.viewUrl}
                    alt={previewDoc.originalName}
                    style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease' }}
                    className="max-w-full max-h-full rounded-lg shadow-md object-contain"
                  />
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-xl">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-700">Preview not available for this file type.</p>
                  <a
                    href={previewDoc.viewUrl}
                    download={previewDoc.originalName}
                    className="inline-block mt-3 text-xs text-brand-action hover:underline font-semibold"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer with Verification Actions */}
            <div className="px-6 py-3.5 bg-white border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Document Status:</span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-pill ${
                    previewDoc.status === 'VERIFIED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : previewDoc.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : previewDoc.status === 'REUPLOAD_REQUESTED'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {previewDoc.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc.status !== 'VERIFIED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUpdateDocumentStatus(previewDoc.id, 'VERIFIED')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8 px-3 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Document</span>
                  </Button>
                )}
                {previewDoc.status !== 'REJECTED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActionModal({
                        type: 'document',
                        targetId: previewDoc.id,
                        targetTitle: previewDoc.originalName,
                        action: 'REJECTED',
                      })
                    }
                    className="text-rose-700 border-rose-200 hover:bg-rose-50 text-xs gap-1.5 h-8 px-3"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </Button>
                )}
                {previewDoc.status !== 'REUPLOAD_REQUESTED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActionModal({
                        type: 'document',
                        targetId: previewDoc.id,
                        targetTitle: previewDoc.originalName,
                        action: 'REUPLOAD_REQUESTED',
                      })
                    }
                    className="text-purple-700 border-purple-200 hover:bg-purple-50 text-xs gap-1.5 h-8 px-3"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Request Re-upload</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Action Dialog (Mandatory Remark) */}
      {actionModal && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {actionModal.action === 'REJECTED' ? (
                  <XCircle className="w-5 h-5 text-rose-500" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-purple-600" />
                )}
                <span>
                  {actionModal.action === 'REJECTED' ? 'Reject' : 'Request Re-upload'}:{' '}
                  {actionModal.type === 'checklist' ? 'Checklist Item' : 'Document'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setActionRemark('');
                  setActionError(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Target: <span className="font-semibold text-slate-800">{actionModal.targetTitle}</span>
              <br />
              Please provide a clear remark explaining the issue. This will be recorded on the candidate timeline and visible to the operations team.
            </p>

            {actionError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {actionError}
              </div>
            )}

            <textarea
              rows={3}
              value={actionRemark}
              onChange={(e) => {
                setActionRemark(e.target.value);
                if (actionError) setActionError(null);
              }}
              placeholder="Enter mandatory remark (e.g. Document unreadable, name mismatch, etc.)..."
              className="w-full p-3 text-xs bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-action/20 focus:border-brand-action resize-none"
            />

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionModal(null);
                  setActionRemark('');
                  setActionError(null);
                }}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmittingAction || !actionRemark.trim()}
                onClick={async () => {
                  if (!actionRemark.trim()) {
                    setActionError('A remark is required.');
                    return;
                  }
                  setIsSubmittingAction(true);
                  if (actionModal.type === 'checklist') {
                    await handleUpdateChecklistItem(actionModal.targetId, actionModal.action, actionRemark.trim());
                  } else {
                    await handleUpdateDocumentStatus(actionModal.targetId, actionModal.action, actionRemark.trim());
                  }
                  setIsSubmittingAction(false);
                  setActionModal(null);
                  setActionRemark('');
                  setActionError(null);
                }}
                className={`text-xs h-8 ${
                  actionModal.action === 'REJECTED'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {isSubmittingAction
                  ? 'Saving...'
                  : `Confirm ${actionModal.action === 'REJECTED' ? 'Rejection' : 'Request'}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
