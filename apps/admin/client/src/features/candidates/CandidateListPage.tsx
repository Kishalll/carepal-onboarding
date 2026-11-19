import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  Filter,
  Download,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Badge, Button, Card } from '@carepal/ui';
import { CandidateDetailDrawer } from './CandidateDetailDrawer.js';

interface CandidateListItem {
  id: string;
  applicationId: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  preferredLanguage: string;
  qualification: string;
  experienceYears: number;
  skills: string[];
  languages: string[];
  availabilityType: string;
  stage: string;
  createdAt: string;
  daysInStage: number;
  stats: {
    totalDocs: number;
    verifiedDocs: number;
    totalChecklist: number;
    verifiedChecklist: number;
  };
}

type StageType = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'VERIFIED' | 'ONBOARDED' | 'REJECTED';

const CITIES = [
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Coimbatore',
];

const QUALIFICATIONS = [
  { value: 'GNM', label: 'GNM' },
  { value: 'ANM', label: 'ANM' },
  { value: 'B_SC_NURSING', label: 'B.Sc Nursing' },
  { value: 'TRAINED_CAREGIVER', label: 'Trained Caregiver' },
];

const STAGES = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'SCREENING', label: 'Screening' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'ONBOARDED', label: 'Onboarded' },
  { value: 'REJECTED', label: 'Rejected' },
];

const AVAILABILITY_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'LIVE_IN', label: 'Live-in' },
  { value: 'NIGHT_SHIFTS', label: 'Night Shifts' },
  { value: 'WEEKENDS', label: 'Weekends' },
];

const LANGUAGES = ['English', 'Hindi', 'Tamil'];

export const CandidateListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Local state for candidate items
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Search input local text (for debounce or smooth typing)
  const currentSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState<string>(currentSearch);

  // Synchronize searchInput when searchParam changes externally
  useEffect(() => {
    setSearchInput(searchParams.get('search') || '');
  }, [searchParams]);

  // Read filter values from URL
  const selectedStage = searchParams.get('stage') || '';
  const selectedCity = searchParams.get('city') || '';
  const selectedQual = searchParams.get('qualification') || '';
  const selectedAvail = searchParams.get('availability') || '';
  const selectedLang = searchParams.get('language') || '';
  const selectedMinExp = searchParams.get('minExperience') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Fetch candidates based on current searchParams
  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const qs = searchParams.toString();
      const res = await fetch(`/api/candidates?${qs}&limit=10`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch candidate list');
      const data = await res.json();
      setCandidates(data.candidates || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Candidate fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Update URL search parameters helper
  const updateFilter = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    // Always reset to page 1 on filter changes
    if (key !== 'page') {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateFilter('search', '');
  };

  const handleClearAllFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  // Determine if any filters are active
  const hasActiveFilters = Boolean(
    selectedStage ||
      selectedCity ||
      selectedQual ||
      selectedAvail ||
      selectedLang ||
      selectedMinExp ||
      currentSearch
  );

  const formatQualification = (q: string) => {
    const item = QUALIFICATIONS.find((item) => item.value === q);
    return item ? item.label : q;
  };

  const handleDownloadCsv = () => {
    const qs = searchParams.toString();
    window.location.href = `/api/candidates/export?${qs}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-brand-heading">
            Candidate Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Search, filter, and review caregiver and nurse applications across India care centers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCandidates}
            className="text-xs gap-1.5 h-9"
            title="Reload records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadCsv}
            className="text-xs gap-1.5 h-9 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters Card */}
      <Card padding="md" variant="white" className="space-y-4 shadow-xs">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by candidate name, phone number, email, or application ID..."
            className="w-full pl-10 pr-24 py-2.5 text-sm bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-action/20 focus:border-brand-action transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-20 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 px-3 py-1.5 bg-brand-action text-white text-xs font-semibold rounded-lg hover:bg-brand-actionHover transition-colors shadow-2xs"
          >
            Search
          </button>
        </form>

        {/* Filter Toolbar Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-gray-100">
          {/* Stage Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              Stage
            </label>
            <select
              value={selectedStage}
              onChange={(e) => updateFilter('stage', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-lg text-slate-700 focus:bg-white focus:border-brand-action focus:outline-none"
            >
              <option value="">All Stages</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              City
            </label>
            <select
              value={selectedCity}
              onChange={(e) => updateFilter('city', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-lg text-slate-700 focus:bg-white focus:border-brand-action focus:outline-none"
            >
              <option value="">All Cities</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Qualification Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              Qualification
            </label>
            <select
              value={selectedQual}
              onChange={(e) => updateFilter('qualification', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-lg text-slate-700 focus:bg-white focus:border-brand-action focus:outline-none"
            >
              <option value="">All Qualifications</option>
              {QUALIFICATIONS.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              Availability
            </label>
            <select
              value={selectedAvail}
              onChange={(e) => updateFilter('availability', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-lg text-slate-700 focus:bg-white focus:border-brand-action focus:outline-none"
            >
              <option value="">All Types</option>
              {AVAILABILITY_TYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Language Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              Language
            </label>
            <select
              value={selectedLang}
              onChange={(e) => updateFilter('language', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-lg text-slate-700 focus:bg-white focus:border-brand-action focus:outline-none"
            >
              <option value="">All Languages</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Min Experience Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              Min Experience
            </label>
            <select
              value={selectedMinExp}
              onChange={(e) => updateFilter('minExperience', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-lg text-slate-700 focus:bg-white focus:border-brand-action focus:outline-none"
            >
              <option value="">Any Experience</option>
              <option value="1">1+ Years</option>
              <option value="3">3+ Years</option>
              <option value="5">5+ Years</option>
              <option value="7">7+ Years</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary & Result Count */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-gray-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Active Filters:</span>
            </span>

            {!hasActiveFilters && (
              <span className="text-gray-400 italic">None (showing all applicants)</span>
            )}

            {currentSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                Search: "{currentSearch}"
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedStage && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Stage: {selectedStage}
                <button
                  type="button"
                  onClick={() => updateFilter('stage', '')}
                  className="hover:text-slate-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCity && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                City: {selectedCity}
                <button
                  type="button"
                  onClick={() => updateFilter('city', '')}
                  className="hover:text-slate-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedQual && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Qual: {formatQualification(selectedQual)}
                <button
                  type="button"
                  onClick={() => updateFilter('qualification', '')}
                  className="hover:text-slate-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedAvail && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Availability: {selectedAvail.replace(/_/g, ' ')}
                <button
                  type="button"
                  onClick={() => updateFilter('availability', '')}
                  className="hover:text-slate-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedLang && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Language: {selectedLang}
                <button
                  type="button"
                  onClick={() => updateFilter('language', '')}
                  className="hover:text-slate-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedMinExp && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Exp: {selectedMinExp}+ yrs
                <button
                  type="button"
                  onClick={() => updateFilter('minExperience', '')}
                  className="hover:text-slate-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold ml-2 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="text-gray-500 font-medium">
            Found <span className="font-bold text-slate-800">{total}</span> matching candidates
          </div>
        </div>
      </Card>

      {/* Candidate Table Card */}
      <Card padding="none" variant="white" className="overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-brand-action border-t-transparent rounded-full animate-spin"></div>
            <div className="mt-3 text-xs text-gray-500 font-medium">
              Loading candidates database...
            </div>
          </div>
        ) : candidates.length === 0 ? (
          /* Empty State */
          <div className="py-20 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-gray-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 font-heading">
              No matching candidates found
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              We couldn't find any candidate records matching your search or filter combination.
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllFilters}
                className="mt-4 text-xs"
              >
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Candidate</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">Qualification</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Exp</th>
                  <th className="py-3.5 px-4">Documents</th>
                  <th className="py-3.5 px-4">Applied</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {candidates.map((c) => {
                  const hasAllDocs = c.stats.totalDocs > 0 && c.stats.verifiedDocs === c.stats.totalDocs;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCandidateId(c.id)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-semibold text-slate-900 group-hover:text-brand-action transition-colors">
                          {c.fullName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono mt-0.5">
                          <span>{c.applicationId}</span>
                          <span>•</span>
                          <span>{c.phone}</span>
                        </div>
                      </td>

                      {/* Stage Badge */}
                      <td className="py-3.5 px-4">
                        <Badge label={c.stage} stage={c.stage as StageType} size="sm" />
                      </td>

                      {/* Qualification */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700">
                          {formatQualification(c.qualification)}
                        </span>
                      </td>

                      {/* City */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{c.city}</span>
                        </span>
                      </td>

                      {/* Experience */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700">
                          {c.experienceYears} {c.experienceYears === 1 ? 'yr' : 'yrs'}
                        </span>
                      </td>

                      {/* Documents Counter */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            hasAllDocs
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : c.stats.totalDocs > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>
                            {c.stats.verifiedDocs}/{c.stats.totalDocs} docs
                          </span>
                        </span>
                      </td>

                      {/* Applied Date */}
                      <td className="py-3.5 px-4 text-gray-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCandidateId(c.id)}
                          className="text-xs py-1 px-2.5 h-7 gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && total > 0 && (
          <div className="px-4 sm:px-6 py-3.5 bg-slate-50/80 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-gray-500">
              Showing{' '}
              <span className="font-semibold text-slate-800">
                {(currentPage - 1) * 10 + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * 10, total)}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{total}</span> applicants
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilter('page', String(Math.max(1, currentPage - 1)))}
                disabled={currentPage <= 1}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>

              <span className="px-3 py-1 font-semibold text-slate-700 bg-white border border-gray-200 rounded-lg shadow-2xs">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateFilter('page', String(Math.min(totalPages, currentPage + 1)))
                }
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Candidate Detail Drawer */}
      <CandidateDetailDrawer
        candidateId={selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
      />
    </div>
  );
};
