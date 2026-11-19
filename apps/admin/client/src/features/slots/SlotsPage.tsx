import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  useToast,
  Skeleton,
} from '@carepal/ui';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  User,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  UserPlus,
  UserX,
  X,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface CandidateRef {
  id: string;
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  stage: string;
  city: string;
  qualification: string;
}

interface InterviewSlot {
  id: string;
  startTime: string;
  endTime: string;
  interviewerName: string;
  mode: 'VIDEO' | 'IN_PERSON' | 'PHONE';
  candidateId: string | null;
  bookingToken: string;
  bookedAt: string | null;
  candidate?: CandidateRef | null;
}

interface SlotMetrics {
  total: number;
  available: number;
  booked: number;
}

export const SlotsPage: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [metrics, setMetrics] = useState<SlotMetrics>({ total: 0, available: 0, booked: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'booked'>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<InterviewSlot | null>(null);
  const [assignCandidates, setAssignCandidates] = useState<CandidateRef[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');

  // Form states for Create Slot
  const [newDate, setNewDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  });
  const [newStartTime, setNewStartTime] = useState('10:00');
  const [newDuration, setNewDuration] = useState('45');
  const [newInterviewer, setNewInterviewer] = useState('Dr. Kavita Sharma (Clinical Operations)');
  const [newMode, setNewMode] = useState<'VIDEO' | 'IN_PERSON' | 'PHONE'>('VIDEO');
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      if (modeFilter !== 'all') params.set('mode', modeFilter);

      const res = await fetch(`/api/slots?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch interview slots');
      const data = await res.json();
      setSlots(data.slots || []);
      setMetrics(data.metrics || { total: 0, available: 0, booked: 0 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching slots';
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, modeFilter, toastError]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const getBookingUrl = (slot: InterviewSlot) => {
    const token = slot.candidate?.applicationId || slot.bookingToken;
    return `${window.location.protocol}//${window.location.hostname}:3000/book/${token}`;
  };

  const handleCopyLink = (slot: InterviewSlot) => {
    const url = getBookingUrl(slot);
    navigator.clipboard.writeText(url);
    setCopiedToken(slot.id);
    toastSuccess('Booking link copied to clipboard');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleOpenLink = (slot: InterviewSlot) => {
    const url = getBookingUrl(slot);
    window.open(url, '_blank');
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newDate || !newStartTime || !newInterviewer.trim()) {
      toastError('Please fill in all slot details');
      return;
    }

    try {
      setCreatingSlot(true);
      const startDateTime = new Date(`${newDate}T${newStartTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(newDuration, 10) * 60000);

      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          interviewerName: newInterviewer.trim(),
          mode: newMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.message || data.error || 'Failed to create slot';
        setCreateError(msg);
        throw new Error(msg);
      }

      toastSuccess('Interview slot created successfully');
      setShowCreateModal(false);
      setCreateError(null);
      fetchSlots();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating slot';
      toastError(msg);
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Are you sure you want to delete this interview slot?')) return;

    try {
      const res = await fetch(`/api/slots/${slotId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete slot');
      }

      toastSuccess('Interview slot removed');
      fetchSlots();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting slot';
      toastError(msg);
    }
  };

  const handleOpenAssignModal = async (slot: InterviewSlot) => {
    setShowAssignModal(slot);
    setCandidateSearch('');
    try {
      setLoadingCandidates(true);
      const res = await fetch('/api/candidates?stage=INTERVIEW&limit=50');
      if (!res.ok) throw new Error('Failed to load interview candidates');
      const data = await res.json();
      setAssignCandidates(data.candidates || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading candidates';
      toastError(msg);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleAssignCandidate = async (candidateId: string) => {
    if (!showAssignModal) return;

    try {
      const res = await fetch(`/api/slots/${showAssignModal.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign candidate');
      }

      toastSuccess('Candidate successfully assigned to slot');
      setShowAssignModal(null);
      fetchSlots();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error assigning candidate';
      toastError(msg);
    }
  };

  const handleUnassign = async (slotId: string) => {
    if (!window.confirm('Unassign candidate and return this slot to available status?')) return;

    try {
      const res = await fetch(`/api/slots/${slotId}/unassign`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unassign slot');
      }

      toastSuccess('Slot returned to available pool');
      fetchSlots();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error unassigning slot';
      toastError(msg);
    }
  };

  const formatSlotTime = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'PHONE':
        return <Phone className="w-3.5 h-3.5" />;
      case 'IN_PERSON':
        return <MapPin className="w-3.5 h-3.5" />;
      case 'VIDEO':
      default:
        return <Video className="w-3.5 h-3.5" />;
    }
  };

  const filteredCandidates = assignCandidates.filter((c) => {
    const q = candidateSearch.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.applicationId.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-brand-heading">
              Interview Slots
            </h1>
            <Badge label={`${metrics.total} Total`} variant="blue" size="md" />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage clinical and technical interview availability, manual candidate assignments, and self-service booking links.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={() => fetchSlots()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
          >
            Create Slot
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="white" padding="md" className="border-l-4 border-l-blue-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-gray-400">Total Slots</span>
              <div className="text-2xl font-bold font-heading text-brand-heading mt-0.5">
                {metrics.total}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-action flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card variant="white" padding="md" className="border-l-4 border-l-green-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-gray-400">Available Slots</span>
              <div className="text-2xl font-bold font-heading text-green-700 mt-0.5">
                {metrics.available}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card variant="white" padding="md" className="border-l-4 border-l-purple-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-gray-400">Booked Slots</span>
              <div className="text-2xl font-bold font-heading text-purple-700 mt-0.5">
                {metrics.booked}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-brand-heading shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'available'
                ? 'bg-white text-green-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Available ({metrics.available})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('booked')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'booked'
                ? 'bg-white text-purple-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Booked ({metrics.booked})
          </button>
        </div>

        <div className="w-48">
          <Select
            options={[
              { value: 'all', label: 'All Modes' },
              { value: 'VIDEO', label: 'Video Call' },
              { value: 'PHONE', label: 'Phone Call' },
              { value: 'IN_PERSON', label: 'In-Person Clinic' },
            ]}
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Slots List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <Card variant="white" padding="lg" className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-action flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-semibold text-base text-brand-heading">
            No interview slots found
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {activeTab !== 'all' || modeFilter !== 'all'
              ? 'No slots match the current filter criteria. Try clearing your filters or creating a new slot.'
              : 'Create your first interview slot to start inviting candidates for clinical interviews.'}
          </p>
          <div className="mt-4">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setCreateError(null);
                setShowCreateModal(true);
              }}
            >
              Create New Slot
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map((slot) => {
            const isBooked = !!slot.candidateId;
            const isPast = new Date(slot.startTime) < new Date();

            return (
              <Card
                key={slot.id}
                variant="white"
                padding="md"
                className={`relative flex flex-col justify-between border transition-all hover:shadow-md ${
                  isBooked
                    ? 'border-purple-200 bg-purple-50/20'
                    : isPast
                    ? 'border-gray-200 bg-gray-50/40 opacity-75'
                    : 'border-blue-100/80 hover:border-brand-action/40'
                }`}
              >
                <div>
                  {/* Top badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[11px] font-semibold ${
                        isBooked
                          ? 'bg-purple-100 text-purple-800'
                          : isPast
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {isBooked ? 'Booked' : isPast ? 'Past Slot' : 'Available'}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-gray-100 text-gray-700 text-[11px] font-medium">
                      {getModeIcon(slot.mode)}
                      <span className="capitalize">{slot.mode.toLowerCase().replace('_', ' ')}</span>
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2 text-sm font-heading font-bold text-brand-heading">
                      <Calendar className="w-4 h-4 text-brand-action shrink-0" />
                      <span>{formatSlotTime(slot.startTime)}</span>
                    </div>
                    <div className="text-xs text-gray-500 pl-6">
                      Interviewer: <span className="font-medium text-gray-700">{slot.interviewerName}</span>
                    </div>
                  </div>

                  {/* Candidate Info if Booked */}
                  {isBooked && slot.candidate && (
                    <div className="my-3 p-3 rounded-xl bg-white border border-purple-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-brand-heading">
                          {slot.candidate.fullName}
                        </span>
                        <Badge label={slot.candidate.qualification} variant="blue" size="sm" />
                      </div>
                      <div className="text-gray-500 text-[11px]">
                        ID: {slot.candidate.applicationId} | {slot.candidate.city}
                      </div>
                      <div className="text-gray-500 text-[11px]">
                        Phone: {slot.candidate.phone}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 mt-2">
                  {!isBooked ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<UserPlus className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenAssignModal(slot)}
                          className="h-8 px-2.5 text-xs"
                        >
                          Assign
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenLink(slot)}
                          className="h-8 px-2.5 text-xs"
                          title="Open booking page in new tab"
                        >
                          Open
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={copiedToken === slot.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          onClick={() => handleCopyLink(slot)}
                          className="h-8 px-2.5 text-xs"
                          title="Copy public booking URL"
                        >
                          {copiedToken === slot.id ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<UserX className="w-3.5 h-3.5" />}
                        onClick={() => handleUnassign(slot.id)}
                        className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Unassign
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenLink(slot)}
                        className="h-8 px-2.5 text-xs"
                        title="Open booking page in new tab"
                      >
                        View Booking
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE SLOT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card variant="white" padding="lg" className="w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-heading font-bold text-brand-heading">
                Create Interview Slot
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setShowCreateModal(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4 mt-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <Input
                label="Interview Date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Time"
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  required
                />
                <Select
                  label="Duration"
                  options={[
                    { value: '30', label: '30 minutes' },
                    { value: '45', label: '45 minutes' },
                    { value: '60', label: '60 minutes' },
                  ]}
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                />
              </div>

              <Input
                label="Interviewer Name & Role"
                placeholder="e.g. Dr. Kavita Sharma (Clinical Operations)"
                value={newInterviewer}
                onChange={(e) => setNewInterviewer(e.target.value)}
                required
              />

              <Select
                label="Interview Mode"
                options={[
                  { value: 'VIDEO', label: 'Video Call (Google Meet / Zoom)' },
                  { value: 'PHONE', label: 'Telephone Interview' },
                  { value: 'IN_PERSON', label: 'In-Person (CarePal Training Center)' },
                ]}
                value={newMode}
                onChange={(e) => setNewMode(e.target.value as 'VIDEO' | 'IN_PERSON' | 'PHONE')}
              />

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={creatingSlot}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Create Slot
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ASSIGN CANDIDATE MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card variant="white" padding="lg" className="w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-heading font-bold text-brand-heading">
                  Assign Slot to Candidate
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Slot: {formatSlotTime(showAssignModal.startTime)} ({showAssignModal.mode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3">
              <Input
                placeholder="Search candidate by name, city, or ID..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
              {loadingCandidates ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No candidates currently in the Interview stage match your query.
                </div>
              ) : (
                filteredCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    onClick={() => handleAssignCandidate(cand.id)}
                    className="p-3 rounded-xl border border-gray-200/80 hover:border-brand-action hover:bg-blue-50/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-brand-heading">
                        {cand.fullName}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {cand.applicationId} | {cand.city} | {cand.qualification}
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" className="h-7 text-xs">
                      Select
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssignModal(null)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
