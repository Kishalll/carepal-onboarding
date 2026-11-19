import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Search,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@carepal/ui';
import { CandidateDetailDrawer } from '../candidates/CandidateDetailDrawer.js';

interface ChecklistItemSummary {
  id: string;
  code: string;
  label: string;
  required: boolean;
  status: string;
  remark?: string | null;
  updatedBy?: string | null;
}

interface DocumentSummary {
  id: string;
  category: string;
  originalName: string;
  status: string;
  mimeType: string;
  sizeBytes: number;
}

interface VerificationCandidate {
  id: string;
  applicationId: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  qualification: string;
  experienceYears: number;
  skills: string[];
  stage: string;
  stageUpdatedAt: string;
  daysInStage: number;
  stats: {
    totalDocs: number;
    verifiedDocs: number;
    totalChecklist: number;
    verifiedChecklist: number;
    requiredCount: number;
    verifiedRequiredCount: number;
    allRequiredVerified: boolean;
    hasReuploadRequested: boolean;
  };
  checklistItems: ChecklistItemSummary[];
  documents: DocumentSummary[];
}

interface VerificationSummary {
  totalInQueue: number;
  totalPendingChecklistItems: number;
  totalReadyToAdvance: number;
  totalReuploadRequested: number;
}

export const VerificationPage: React.FC = () => {
  const [candidates, setCandidates] = useState<VerificationCandidate[]>([]);
  const [summary, setSummary] = useState<VerificationSummary>({
    totalInQueue: 0,
    totalPendingChecklistItems: 0,
    totalReadyToAdvance: 0,
    totalReuploadRequested: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'READY' | 'FLAGGED'>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');

  // Selected candidate for detail drawer
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/candidates/verification/queue', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load verification queue');
      const data = await res.json();
      setCandidates(data.queue);
      setSummary(data.summary);
    } catch (err: unknown) {
      console.error('Queue load error:', err);
      setError((err as Error).message || 'Could not fetch verification queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.fullName.toLowerCase().includes(query);
        const matchesAppId = c.applicationId.toLowerCase().includes(query);
        const matchesPhone = c.phone.includes(query);
        if (!matchesName && !matchesAppId && !matchesPhone) return false;
      }

      // Stage filter
      if (stageFilter !== 'ALL' && c.stage !== stageFilter) {
        return false;
      }

      // City filter
      if (cityFilter !== 'ALL' && c.city !== cityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'READY') {
        return c.stats.allRequiredVerified;
      }
      if (statusFilter === 'FLAGGED') {
        return (
          c.stats.hasReuploadRequested ||
          c.checklistItems.some((i) => i.status === 'REJECTED') ||
          c.documents.some((d) => d.status === 'REJECTED')
        );
      }
      if (statusFilter === 'PENDING') {
        return !c.stats.allRequiredVerified;
      }

      return true;
    });
  }, [candidates, searchQuery, stageFilter, statusFilter, cityFilter]);

  // Unique cities in current queue
  const cities = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => set.add(c.city));
    return Array.from(set).sort();
  }, [candidates]);

  return (
    <div className="space-y-6">
      {/* Header and Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <span>Operations</span>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Verification Hub</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Verification Hub</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-lightBlue text-brand-deepBlue border border-brand-teal/30">
                Stage Gate Enforced
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Verify candidate identity documents and qualification checklists required to satisfy pipeline gates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchQueue}
              disabled={loading}
              className="gap-1.5 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            In Verification Queue
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {summary.totalInQueue}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Screening & Interview stages</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Pending Checklist Checks
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {summary.totalPendingChecklistItems}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Items requiring staff review</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Ready to Advance
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {summary.totalReadyToAdvance}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Gate cleared for Verified stage</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Flagged / Re-upload
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {summary.totalReuploadRequested}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-500" />
            <span>Rejection or re-upload active</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, ID, or phone number..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-action/20 focus:border-brand-action transition-all"
            />
          </div>

          {/* City filter dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="py-2 px-3 text-xs bg-slate-50 border border-gray-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-action/20 focus:border-brand-action"
            >
              <option value="ALL">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 mr-1">Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Queue ({candidates.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pending Checks ({candidates.filter((c) => !c.stats.allRequiredVerified).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('READY')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'READY'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Ready to Advance ({summary.totalReadyToAdvance})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('FLAGGED')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'FLAGGED'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Flagged / Re-upload ({summary.totalReuploadRequested})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Stage:</span>
            {['ALL', 'SCREENING', 'INTERVIEW'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStageFilter(st)}
                className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-colors ${
                  stageFilter === st
                    ? 'bg-brand-action text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {st === 'ALL' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate Queue List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <RefreshCw className="w-6 h-6 text-brand-action animate-spin mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">Loading verification queue...</div>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-rose-50 rounded-xl border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
          <CheckSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <div className="text-base font-semibold text-slate-800">No candidates match active filters</div>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, status chips, or city filter to view more applicants.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStageFilter('ALL');
              setStatusFilter('ALL');
              setCityFilter('ALL');
            }}
            className="mt-4 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredCandidates.map((c) => {
            const isReady = c.stats.allRequiredVerified;
            const progressPercent =
              c.stats.totalChecklist > 0
                ? Math.round((c.stats.verifiedChecklist / c.stats.totalChecklist) * 100)
                : 0;

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-brand-action/40 transition-all p-5 shadow-2xs hover:shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Candidate Identity */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-gray-500 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                        {c.applicationId}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{c.fullName}</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {c.qualification.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${
                          c.stage === 'INTERVIEW'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {c.stage}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{c.city}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        <span>{c.experienceYears} yrs experience</span>
                      </span>
                      <span>•</span>
                      <span>{c.phone}</span>
                      <span>•</span>
                      <span>{c.daysInStage}d in {c.stage.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Verification Status & Action */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                    {/* Progress indicator */}
                    <div className="w-full sm:w-48 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600">Checklist:</span>
                        <span className={isReady ? 'text-emerald-700' : 'text-slate-800'}>
                          {c.stats.verifiedChecklist} / {c.stats.totalChecklist} verified
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isReady ? 'bg-emerald-500' : 'bg-brand-action'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center justify-between">
                        <span>Documents: {c.stats.verifiedDocs}/{c.stats.totalDocs}</span>
                        <span>{progressPercent}% complete</span>
                      </div>
                    </div>

                    {/* Stage Gate Pill */}
                    <div className="shrink-0">
                      {isReady ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Gate Cleared</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Pending Gate</span>
                        </div>
                      )}
                    </div>

                    {/* Open Review Drawer Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedCandidateId(c.id)}
                      className="gap-1.5 text-xs h-9 px-4 shrink-0 shadow-2xs"
                    >
                      <span>Review Checklist</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Checklist Chips Breakdown */}
                <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-400 mr-1">Checklist Items:</span>
                  {c.checklistItems.map((chk) => {
                    const isVer = chk.status === 'VERIFIED';
                    const isRej = chk.status === 'REJECTED';
                    const isReup = chk.status === 'REUPLOAD_REQUESTED';

                    return (
                      <span
                        key={chk.id}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          isVer
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isRej
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : isReup
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                        title={`${chk.label} (${chk.status})`}
                      >
                        {isVer ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : isRej ? (
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                        ) : isReup ? (
                          <RefreshCw className="w-3 h-3 text-purple-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-slate-400" />
                        )}
                        <span className="truncate max-w-[160px]">{chk.label}</span>
                        {chk.required && <span className="text-rose-500 font-bold">*</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Detail Drawer */}
      <CandidateDetailDrawer
        candidateId={selectedCandidateId}
        initialTab="checklist"
        onClose={() => setSelectedCandidateId(null)}
        onCandidateUpdated={fetchQueue}
      />
    </div>
  );
};
