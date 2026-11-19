import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Badge,
  useToast,
  Skeleton,
} from '@carepal/ui';
import {
  Copy,
  AlertTriangle,
  CheckCircle2,
  UserX,
  GitMerge,
  ExternalLink,
  RefreshCw,
  Clock,
  MapPin,
  Calendar,
  FileText,
  ShieldCheck,
  X,
} from 'lucide-react';
import { CandidateDetailDrawer } from '../candidates/CandidateDetailDrawer.js';

interface CandidateRef {
  id: string;
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  city: string;
  qualification: string;
  experienceYears: number;
  stage: string;
  createdAt: string;
  documentsCount: number;
  verifiedDocumentsCount: number;
  notesCount: number;
}

interface DuplicatePair {
  id: string;
  reason: 'MATCHING_EMAIL' | 'MATCHING_NAME_AND_DOB';
  reasonText: string;
  primaryCandidate: CandidateRef;
  duplicateCandidate: CandidateRef;
  createdAt: string;
}

export const DuplicateReviewPage: React.FC = () => {
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Action modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    pair: DuplicatePair | null;
    action: 'REJECT_DUPLICATE' | 'MERGE_NOTES' | 'MARK_DISTINCT' | null;
    note: string;
    submitting: boolean;
  }>({
    open: false,
    pair: null,
    action: null,
    note: '',
    submitting: false,
  });

  const { toastSuccess, toastError } = useToast();

  const fetchDuplicates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/candidates/duplicates');
      if (!res.ok) throw new Error('Failed to fetch duplicate candidates');
      const data = await res.json();
      setPairs(data.pairs || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching duplicates';
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  const handleOpenActionModal = (
    pair: DuplicatePair,
    action: 'REJECT_DUPLICATE' | 'MERGE_NOTES' | 'MARK_DISTINCT'
  ) => {
    setActionModal({
      open: true,
      pair,
      action,
      note: '',
      submitting: false,
    });
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal.pair || !actionModal.action) return;

    try {
      setActionModal((prev) => ({ ...prev, submitting: true }));

      const res = await fetch('/api/candidates/duplicates/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryId: actionModal.pair.primaryCandidate.id,
          duplicateId: actionModal.pair.duplicateCandidate.id,
          action: actionModal.action,
          note: actionModal.note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resolve duplicate pair');
      }

      toastSuccess(
        actionModal.action === 'REJECT_DUPLICATE'
          ? 'Duplicate candidate rejected with audit note.'
          : actionModal.action === 'MERGE_NOTES'
          ? 'Notes merged into primary candidate and duplicate closed.'
          : 'Pair verified and marked as distinct applicants.'
      );

      setActionModal({
        open: false,
        pair: null,
        action: null,
        note: '',
        submitting: false,
      });

      fetchDuplicates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resolving duplicate';
      toastError(msg);
      setActionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const formatQualification = (q: string) => {
    switch (q) {
      case 'B_SC_NURSING':
        return 'B.Sc Nursing';
      case 'TRAINED_CAREGIVER':
        return 'Trained Caregiver';
      default:
        return q;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-brand-heading">
              Duplicate Review
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Copy className="w-3.5 h-3.5 text-amber-600" />
              <span>{pairs.length} Flagged</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Compare candidate records that share email addresses or matching personal details to prevent duplicate onboarding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => fetchDuplicates()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : pairs.length === 0 ? (
        <Card variant="white" padding="lg" className="text-center py-16">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">All Clear: No Duplicates Detected</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1.5">
            Every application currently in the pipeline has unique email and identity records. Any incoming duplicates will automatically appear here for review.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {pairs.map((pair) => (
            <Card key={pair.id} variant="white" padding="none" className="overflow-hidden shadow-sm border border-gray-200/90 rounded-2xl">
              {/* Pair Reason Banner */}
              <div className="px-5 py-3 bg-amber-50/80 border-b border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    {pair.reason === 'MATCHING_EMAIL' ? 'Shared Email Detected' : 'Name & Date of Birth Match'}
                  </span>
                  <span className="text-xs text-amber-800 font-medium">
                    ({pair.reasonText})
                  </span>
                </div>
                <div className="text-[11px] text-amber-700 font-mono">
                  Pair ID: {pair.id}
                </div>
              </div>

              {/* Side-by-side comparison grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                {/* Primary Candidate (Left) */}
                <div className="p-5 space-y-4 bg-slate-50/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                        Primary Record (Older)
                      </span>
                      <span className="font-mono text-xs text-gray-500">
                        {pair.primaryCandidate.applicationId}
                      </span>
                    </div>
                    <Badge label={pair.primaryCandidate.stage} stage={pair.primaryCandidate.stage as any} size="sm" />
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {pair.primaryCandidate.fullName}
                    </h4>
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-medium w-20">Email:</span>
                        <span className="font-mono font-semibold text-slate-800">{pair.primaryCandidate.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-medium w-20">Phone:</span>
                        <span className="font-mono text-slate-800">{pair.primaryCandidate.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-medium w-20">DOB:</span>
                        <span className="text-slate-800">{new Date(pair.primaryCandidate.dateOfBirth).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/80 text-xs">
                    <div>
                      <span className="text-[11px] text-gray-400 block">Qualification</span>
                      <span className="font-semibold text-slate-800">{formatQualification(pair.primaryCandidate.qualification)}</span>
                      <span className="text-gray-500 text-[11px] block">{pair.primaryCandidate.experienceYears} yrs experience</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-400 block">City</span>
                      <span className="font-semibold text-slate-800">{pair.primaryCandidate.city}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/80 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span>{pair.primaryCandidate.verifiedDocumentsCount}/{pair.primaryCandidate.documentsCount} docs verified</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCandidateId(pair.primaryCandidate.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-action hover:text-brand-actionHover"
                    >
                      <span>View Full Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Duplicate Candidate (Right) */}
                <div className="p-5 space-y-4 bg-amber-50/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                        Flagged Duplicate (Newer)
                      </span>
                      <span className="font-mono text-xs text-gray-500">
                        {pair.duplicateCandidate.applicationId}
                      </span>
                    </div>
                    <Badge label={pair.duplicateCandidate.stage} stage={pair.duplicateCandidate.stage as any} size="sm" />
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {pair.duplicateCandidate.fullName}
                    </h4>
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-medium w-20">Email:</span>
                        <span className="font-mono font-semibold text-slate-800">{pair.duplicateCandidate.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-medium w-20">Phone:</span>
                        <span className="font-mono text-slate-800">{pair.duplicateCandidate.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-medium w-20">DOB:</span>
                        <span className="text-slate-800">{new Date(pair.duplicateCandidate.dateOfBirth).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/80 text-xs">
                    <div>
                      <span className="text-[11px] text-gray-400 block">Qualification</span>
                      <span className="font-semibold text-slate-800">{formatQualification(pair.duplicateCandidate.qualification)}</span>
                      <span className="text-gray-500 text-[11px] block">{pair.duplicateCandidate.experienceYears} yrs experience</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-400 block">City</span>
                      <span className="font-semibold text-slate-800">{pair.duplicateCandidate.city}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/80 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span>{pair.duplicateCandidate.verifiedDocumentsCount}/{pair.duplicateCandidate.documentsCount} docs verified</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCandidateId(pair.duplicateCandidate.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-action hover:text-brand-actionHover"
                    >
                      <span>View Full Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="p-4 bg-slate-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  Choose resolution action for this duplicate match:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    onClick={() => handleOpenActionModal(pair, 'MARK_DISTINCT')}
                  >
                    Mark as Distinct
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<GitMerge className="w-3.5 h-3.5 text-indigo-600" />}
                    onClick={() => handleOpenActionModal(pair, 'MERGE_NOTES')}
                  >
                    Merge Notes & Close Duplicate
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<UserX className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenActionModal(pair, 'REJECT_DUPLICATE')}
                  >
                    Reject Duplicate Candidate
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {actionModal.open && actionModal.pair && actionModal.action && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card variant="white" padding="lg" className="w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-heading font-bold text-brand-heading">
                {actionModal.action === 'REJECT_DUPLICATE'
                  ? 'Reject Duplicate Candidate'
                  : actionModal.action === 'MERGE_NOTES'
                  ? 'Merge Notes and Reject Duplicate'
                  : 'Mark as Distinct Candidates'}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal({ open: false, pair: null, action: null, note: '', submitting: false })}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteAction} className="space-y-4 mt-4">
              <p className="text-xs text-gray-600">
                {actionModal.action === 'REJECT_DUPLICATE' && (
                  <span>
                    Candidate <strong>{actionModal.pair.duplicateCandidate.applicationId}</strong> ({actionModal.pair.duplicateCandidate.fullName}) will be moved to the Rejected stage with an audit note pointing to primary candidate <strong>{actionModal.pair.primaryCandidate.applicationId}</strong>.
                  </span>
                )}
                {actionModal.action === 'MERGE_NOTES' && (
                  <span>
                    All timeline notes from <strong>{actionModal.pair.duplicateCandidate.applicationId}</strong> will be copied into <strong>{actionModal.pair.primaryCandidate.applicationId}</strong>, and the duplicate application will be marked as Rejected.
                  </span>
                )}
                {actionModal.action === 'MARK_DISTINCT' && (
                  <span>
                    Both candidates will be marked with an audit note confirming they have been reviewed and verified as separate, distinct individuals.
                  </span>
                )}
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Audit Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={actionModal.note}
                  onChange={(e) => setActionModal((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Enter any additional context or operator remarks..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-action/20 focus:border-brand-action"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal({ open: false, pair: null, action: null, note: '', submitting: false })}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={actionModal.action === 'REJECT_DUPLICATE' ? 'danger' : 'primary'}
                  size="sm"
                  loading={actionModal.submitting}
                >
                  Confirm Action
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Candidate Profile Drawer */}
      <CandidateDetailDrawer
        candidateId={selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
        onCandidateUpdated={() => fetchDuplicates()}
      />
    </div>
  );
};
