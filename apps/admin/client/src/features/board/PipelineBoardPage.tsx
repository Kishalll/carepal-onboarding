import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  Kanban,
  Table as TableIcon,
  RefreshCw,
  MapPin,
  FileText,
  AlertCircle,
  MoreVertical,
  ArrowRight,
  RotateCcw,
  UserX,
} from 'lucide-react';
import { Button } from '@carepal/ui';
import { CandidateDetailDrawer } from '../candidates/CandidateDetailDrawer.js';
import { CandidateListPage } from '../candidates/CandidateListPage.js';

type StageType = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'VERIFIED' | 'ONBOARDED' | 'REJECTED';

interface BoardCandidate {
  id: string;
  applicationId: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  qualification: string;
  skills: string[];
  experienceYears: number;
  stage: StageType;
  stageUpdatedAt: string;
  daysInStage: number;
  stats: {
    totalDocs: number;
    verifiedDocs: number;
    totalChecklist: number;
    verifiedChecklist: number;
  };
}

const STAGE_COLUMNS: { stage: StageType; label: string; accentColor: string; bgAccent: string }[] = [
  { stage: 'APPLIED', label: 'Applied', accentColor: 'bg-blue-500', bgAccent: 'bg-blue-50/50' },
  { stage: 'SCREENING', label: 'Screening', accentColor: 'bg-amber-500', bgAccent: 'bg-amber-50/50' },
  { stage: 'VERIFIED', label: 'Verified', accentColor: 'bg-teal-500', bgAccent: 'bg-teal-50/50' },
  { stage: 'INTERVIEW', label: 'Interview', accentColor: 'bg-purple-500', bgAccent: 'bg-purple-50/50' },
  { stage: 'ONBOARDED', label: 'Onboarded', accentColor: 'bg-emerald-500', bgAccent: 'bg-emerald-50/50' },
  { stage: 'REJECTED', label: 'Rejected', accentColor: 'bg-rose-500', bgAccent: 'bg-rose-50/50' },
];

const NORMAL_ORDER: StageType[] = ['APPLIED', 'SCREENING', 'VERIFIED', 'INTERVIEW', 'ONBOARDED'];

// Draggable Card Component
const DraggableCandidateCard: React.FC<{
  candidate: BoardCandidate;
  onSelect: (id: string) => void;
  onMoveClick: (candidate: BoardCandidate, targetStage: StageType) => void;
}> = ({ candidate, onSelect, onMoveClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: candidate.id,
    data: { candidate, stage: candidate.stage },
  });

  const [menuOpen, setMenuOpen] = useState(false);

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

  const hasAllDocs =
    candidate.stats.totalDocs > 0 && candidate.stats.verifiedDocs === candidate.stats.totalDocs;

  // Available moves for mobile / quick action
  const currentIdx = NORMAL_ORDER.indexOf(candidate.stage);
  const nextStage = currentIdx >= 0 && currentIdx < NORMAL_ORDER.length - 1 ? NORMAL_ORDER[currentIdx + 1] : null;
  const prevStage = currentIdx > 0 ? NORMAL_ORDER[currentIdx - 1] : null;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(candidate.id)}
      style={{ opacity: isDragging ? 0.35 : 1 }}
      className="p-3.5 rounded-xl bg-white border border-gray-200/90 shadow-2xs hover:shadow-sm hover:border-brand-action/40 transition-all cursor-grab active:cursor-grabbing relative group select-none"
    >
      {/* Top row: App ID and Quick Move Menu */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="font-mono text-[10px] font-semibold text-gray-500 bg-slate-100 px-1.5 py-0.5 rounded">
          {candidate.applicationId}
        </span>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded text-gray-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Move candidate"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-6 z-30 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-xs divide-y divide-gray-100"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <div className="py-1">
                {nextStage && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onMoveClick(candidate, nextStage);
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center justify-between font-medium"
                  >
                    <span>Advance to {nextStage}</span>
                    <ArrowRight className="w-3 h-3 text-brand-action" />
                  </button>
                )}

                {prevStage && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onMoveClick(candidate, prevStage);
                    }}
                    className="w-full text-left px-3 py-1.5 text-amber-700 hover:bg-amber-50 flex items-center justify-between font-medium"
                  >
                    <span>Move back to {prevStage}</span>
                    <RotateCcw className="w-3 h-3 text-amber-600" />
                  </button>
                )}

                {candidate.stage === 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onMoveClick(candidate, 'SCREENING');
                    }}
                    className="w-full text-left px-3 py-1.5 text-blue-700 hover:bg-blue-50 flex items-center justify-between font-medium"
                  >
                    <span>Reopen to Screening</span>
                    <RotateCcw className="w-3 h-3 text-blue-600" />
                  </button>
                )}
              </div>

              {candidate.stage !== 'REJECTED' && (
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onMoveClick(candidate, 'REJECTED');
                    }}
                    className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 flex items-center justify-between font-medium"
                  >
                    <span>Reject Candidate</span>
                    <UserX className="w-3 h-3 text-rose-600" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Name and Qualification */}
      <h4 className="font-bold text-sm text-slate-900 group-hover:text-brand-action transition-colors truncate">
        {candidate.fullName}
      </h4>
      <div className="text-[11px] text-gray-500 font-medium mt-0.5">
        {formatQualification(candidate.qualification)} • {candidate.experienceYears} yrs
      </div>

      {/* City */}
      <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-2">
        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
        <span className="truncate">{candidate.city}</span>
      </div>

      {/* Skills tags */}
      {candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {candidate.skills.slice(0, 2).map((skill) => (
            <span
              key={skill}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200/60 truncate max-w-[130px]"
            >
              {skill}
            </span>
          ))}
          {candidate.skills.length > 2 && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-slate-50 text-slate-500">
              +{candidate.skills.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Bottom meta row */}
      <div className="flex items-center justify-between text-[11px] pt-2.5 mt-2.5 border-t border-gray-100 text-gray-400">
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            hasAllDocs
              ? 'bg-emerald-50 text-emerald-700'
              : candidate.stats.totalDocs > 0
              ? 'bg-amber-50 text-amber-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          <FileText className="w-2.5 h-2.5" />
          <span>
            {candidate.stats.verifiedDocs}/{candidate.stats.totalDocs}
          </span>
        </span>

        <span>
          {candidate.daysInStage === 0 ? 'Today' : `${candidate.daysInStage}d in stage`}
        </span>
      </div>
    </div>
  );
};

// Droppable Column Component
const DroppableColumn: React.FC<{
  stage: StageType;
  label: string;
  accentColor: string;
  bgAccent: string;
  candidates: BoardCandidate[];
  onSelectCandidate: (id: string) => void;
  onMoveClick: (candidate: BoardCandidate, targetStage: StageType) => void;
}> = ({ stage, label, accentColor, candidates, onSelectCandidate, onMoveClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { stage },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl bg-slate-100/70 border transition-colors min-w-[270px] w-full max-w-xs shrink-0 ${
        isOver ? 'border-brand-action bg-blue-50/40 ring-2 ring-brand-action/20' : 'border-gray-200/80'
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-gray-200/80 flex items-center justify-between bg-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${accentColor}`} />
          <h3 className="text-xs font-bold font-heading text-slate-800 uppercase tracking-wider">
            {label}
          </h3>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
          {candidates.length}
        </span>
      </div>

      {/* Cards Scroll Area */}
      <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-270px)] min-h-[140px]">
        {candidates.map((candidate) => (
          <DraggableCandidateCard
            key={candidate.id}
            candidate={candidate}
            onSelect={onSelectCandidate}
            onMoveClick={onMoveClick}
          />
        ))}

        {candidates.length === 0 && (
          <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <span className="text-[11px] text-gray-400 font-medium">No candidates in {label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const PipelineBoardPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [board, setBoard] = useState<Record<StageType, BoardCandidate[]>>({
    APPLIED: [],
    SCREENING: [],
    INTERVIEW: [],
    VERIFIED: [],
    ONBOARDED: [],
    REJECTED: [],
  });
  const [counts, setCounts] = useState<Record<StageType, number>>({
    APPLIED: 0,
    SCREENING: 0,
    INTERVIEW: 0,
    VERIFIED: 0,
    ONBOARDED: 0,
    REJECTED: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Active dragged card for overlay preview
  const [activeCandidate, setActiveCandidate] = useState<BoardCandidate | null>(null);

  // Error alert banner
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mobile selected stage tab
  const [mobileStageTab, setMobileStageTab] = useState<StageType>('APPLIED');

  // Reason note modal state
  const [reasonModal, setReasonModal] = useState<{
    open: boolean;
    candidate: BoardCandidate | null;
    targetStage: StageType | null;
    isBackward: boolean;
    isReject: boolean;
    isReopen: boolean;
    note: string;
    submitting: boolean;
  }>({
    open: false,
    candidate: null,
    targetStage: null,
    isBackward: false,
    isReject: false,
    isReopen: false,
    note: '',
    submitting: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/candidates/board', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load board data');
      const data = await res.json();
      setBoard(data.board);
      setCounts(data.counts);
    } catch (err) {
      console.error('Board fetch error:', err);
      setErrorMessage('Failed to connect to operations board.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Execute stage change API call with optimistic update and rollback
  const executeStageTransition = async (
    candidate: BoardCandidate,
    toStage: StageType,
    reasonNote?: string
  ) => {
    const fromStage = candidate.stage;
    if (fromStage === toStage) return;

    // Snapshot previous board for rollback
    const previousBoard = { ...board };
    const previousCounts = { ...counts };

    // Optimistically update UI
    setBoard((prev) => {
      const nextFrom = prev[fromStage].filter((c) => c.id !== candidate.id);
      const nextTo = [{ ...candidate, stage: toStage }, ...prev[toStage]];
      return {
        ...prev,
        [fromStage]: nextFrom,
        [toStage]: nextTo,
      };
    });

    setCounts((prev) => ({
      ...prev,
      [fromStage]: Math.max(0, prev[fromStage] - 1),
      [toStage]: prev[toStage] + 1,
    }));

    try {
      const res = await fetch(`/api/candidates/${candidate.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toStage, reasonNote }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Rollback state on error
        setBoard(previousBoard);
        setCounts(previousCounts);
        setErrorMessage(data.error || `Failed to transition candidate to ${toStage}`);
        return;
      }

      // Success
      setErrorMessage(null);
    } catch (err) {
      console.error('Transition error:', err);
      // Rollback
      setBoard(previousBoard);
      setCounts(previousCounts);
      setErrorMessage('Network error occurred during stage transition.');
    }
  };

  const handleStageMoveRequest = (candidate: BoardCandidate, targetStage: StageType) => {
    const fromStage = candidate.stage;
    const fromIdx = NORMAL_ORDER.indexOf(fromStage);
    const toIdx = NORMAL_ORDER.indexOf(targetStage);

    const isBackward = fromIdx >= 0 && toIdx >= 0 && toIdx < fromIdx;
    const isReject = targetStage === 'REJECTED';
    const isReopen = fromStage === 'REJECTED' && targetStage === 'SCREENING';

    // If note is required, open modal
    if (isBackward || isReject || isReopen) {
      setReasonModal({
        open: true,
        candidate,
        targetStage,
        isBackward,
        isReject,
        isReopen,
        note: '',
        submitting: false,
      });
    } else {
      executeStageTransition(candidate, targetStage);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const candidate = event.active.data.current?.candidate as BoardCandidate;
    setActiveCandidate(candidate || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCandidate(null);
    const { active, over } = event;
    if (!over) return;

    const candidate = active.data.current?.candidate as BoardCandidate;
    if (!candidate) return;

    // over.id can be a column stage name (e.g. 'SCREENING') or another candidate's id
    let targetStage: StageType | null = null;

    if (STAGE_COLUMNS.some((col) => col.stage === over.id)) {
      targetStage = over.id as StageType;
    } else if (over.data.current?.stage) {
      targetStage = over.data.current.stage as StageType;
    }

    if (!targetStage || targetStage === candidate.stage) return;

    handleStageMoveRequest(candidate, targetStage);
  };

  const handleConfirmReasonNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonModal.candidate || !reasonModal.targetStage) return;
    if (!reasonModal.note.trim()) {
      setErrorMessage('A note is required for this transition.');
      return;
    }

    setReasonModal((prev) => ({ ...prev, submitting: true }));
    await executeStageTransition(
      reasonModal.candidate,
      reasonModal.targetStage,
      reasonModal.note.trim()
    );
    setReasonModal({
      open: false,
      candidate: null,
      targetStage: null,
      isBackward: false,
      isReject: false,
      isReopen: false,
      note: '',
      submitting: false,
    });
  };

  const totalCandidates = Object.values(counts).reduce((a, b) => a + b, 0);

  if (viewMode === 'table') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <div className="text-sm font-semibold text-gray-500">
            Viewing candidates in Table View
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-brand-action shadow-xs"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>
        </div>
        <CandidateListPage />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-brand-heading">
            Operations Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tracking {totalCandidates} candidate applications across stages with verified rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-brand-action shadow-xs"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchBoard}
            className="text-xs gap-1.5 h-9"
            title="Refresh pipeline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-900">Stage Transition Rejected</div>
              <div className="text-xs text-red-700 mt-0.5">{errorMessage}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-3 border-brand-action border-t-transparent rounded-full animate-spin"></div>
          <div className="mt-3 text-xs text-gray-500 font-medium">Loading pipeline board...</div>
        </div>
      ) : (
        <>
          {/* Mobile Stage Tabs (visible only on small screens) */}
          <div className="md:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {STAGE_COLUMNS.map((col) => {
            const isActive = mobileStageTab === col.stage;
            return (
              <button
                key={col.stage}
                type="button"
                onClick={() => setMobileStageTab(col.stage)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  isActive
                    ? 'bg-brand-ink text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${col.accentColor}`} />
                <span>{col.label}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {counts[col.stage]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile Stage Cards List */}
        <div className="space-y-3 mt-3">
          {board[mobileStageTab].map((candidate) => (
            <DraggableCandidateCard
              key={candidate.id}
              candidate={candidate}
              onSelect={(id) => setSelectedCandidateId(id)}
              onMoveClick={handleStageMoveRequest}
            />
          ))}

          {board[mobileStageTab].length === 0 && (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
              <span className="text-xs text-gray-400">
                No candidates in {mobileStageTab} stage
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Kanban Board (Drag and Drop) */}
      <div className="hidden md:block">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
            {STAGE_COLUMNS.map((col) => (
              <DroppableColumn
                key={col.stage}
                stage={col.stage}
                label={col.label}
                accentColor={col.accentColor}
                bgAccent={col.bgAccent}
                candidates={board[col.stage]}
                onSelectCandidate={(id) => setSelectedCandidateId(id)}
                onMoveClick={handleStageMoveRequest}
              />
            ))}
          </div>

          {/* Drag Overlay Preview */}
          <DragOverlay>
            {activeCandidate ? (
              <div className="p-3.5 rounded-xl bg-white border-2 border-brand-action shadow-xl w-64 rotate-2 opacity-95">
                <span className="font-mono text-[10px] font-semibold text-gray-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {activeCandidate.applicationId}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-1">
                  {activeCandidate.fullName}
                </h4>
                <div className="text-[11px] text-gray-500">
                  {activeCandidate.qualification} • {activeCandidate.city}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      </>
      )}

      {/* Reason Note Modal */}
      {reasonModal.open && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-gray-100">
            <h3 className="text-base font-bold font-heading text-slate-900">
              {reasonModal.isReject
                ? 'Reject Candidate'
                : reasonModal.isReopen
                ? 'Reopen Candidate to Screening'
                : 'Move Backward to Previous Stage'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {reasonModal.isReject
                ? `Please provide a reason for rejecting ${reasonModal.candidate?.fullName}. This note will be recorded in the candidate history.`
                : reasonModal.isReopen
                ? `Provide a note explaining why ${reasonModal.candidate?.fullName} is being reopened for screening.`
                : `Moving backward from ${reasonModal.candidate?.stage} to ${reasonModal.targetStage} requires an explanatory note.`}
            </p>

            <form onSubmit={handleConfirmReasonNote} className="mt-4 space-y-4">
              <textarea
                rows={3}
                value={reasonModal.note}
                onChange={(e) =>
                  setReasonModal((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="Enter mandatory transition note..."
                required
                className="w-full p-3 text-xs bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-action/20 focus:border-brand-action transition-all resize-none"
              />

              <div className="flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setReasonModal({
                      open: false,
                      candidate: null,
                      targetStage: null,
                      isBackward: false,
                      isReject: false,
                      isReopen: false,
                      note: '',
                      submitting: false,
                    })
                  }
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={reasonModal.submitting || !reasonModal.note.trim()}
                  className="text-xs"
                >
                  {reasonModal.submitting ? 'Updating...' : 'Confirm Transition'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Detail Drawer */}
      <CandidateDetailDrawer
        candidateId={selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
      />
    </div>
  );
};
