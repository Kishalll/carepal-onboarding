import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Stage } from '@carepal/shared';

// Pure transition validator mirroring server rules
const NORMAL_STAGE_ORDER = [
  Stage.APPLIED,
  Stage.SCREENING,
  Stage.VERIFIED,
  Stage.INTERVIEW,
  Stage.ONBOARDED,
];

function validateStageTransition(fromStage, targetStage, note, checklistItems = []) {
  if (fromStage === targetStage) {
    return { valid: false, error: `Candidate is already in ${targetStage} stage` };
  }

  // Rejecting candidate
  if (targetStage === Stage.REJECTED) {
    if (!note || !note.trim()) {
      return { valid: false, error: 'A reason note is required when rejecting a candidate' };
    }
    return { valid: true };
  }

  // Reopening from rejected
  if (fromStage === Stage.REJECTED) {
    if (targetStage !== Stage.SCREENING) {
      return { valid: false, error: 'Rejected candidates can only be reopened to the Screening stage' };
    }
    if (!note || !note.trim()) {
      return { valid: false, error: 'A reason note is required when reopening a rejected candidate' };
    }
    return { valid: true };
  }

  const fromIdx = NORMAL_STAGE_ORDER.indexOf(fromStage);
  const toIdx = NORMAL_STAGE_ORDER.indexOf(targetStage);

  if (fromIdx === -1 || toIdx === -1) {
    return { valid: false, error: `Invalid stage transition from ${fromStage} to ${targetStage}` };
  }

  const stepDiff = toIdx - fromIdx;

  // Cannot skip stages forward
  if (stepDiff > 1) {
    return {
      valid: false,
      error: `Cannot skip stages. Candidates must advance one stage at a time: ${fromStage} to ${NORMAL_STAGE_ORDER[fromIdx + 1]}`,
    };
  }

  // Backward moves require reason note
  if (stepDiff === -1) {
    if (!note || !note.trim()) {
      return {
        valid: false,
        error: 'A note explaining the reason is required when moving a candidate back to a previous stage',
      };
    }
  } else if (stepDiff < -1) {
    return { valid: false, error: 'Cannot move backward by more than one stage at a time' };
  }

  // Stage gate for VERIFIED
  if (targetStage === Stage.VERIFIED) {
    const requiredItems = checklistItems.filter((item) => item.required);
    const unverified = requiredItems.filter((item) => item.status !== 'VERIFIED');
    if (unverified.length > 0) {
      return {
        valid: false,
        error: `Cannot advance to Verified stage. ${unverified.length} required checklist items are not yet verified.`,
      };
    }
  }

  return { valid: true };
}

describe('Unit: Stage Transition State Machine and Rule Enforcement', () => {
  it('allows advancing forward by exactly one stage', () => {
    assert.strictEqual(validateStageTransition(Stage.APPLIED, Stage.SCREENING, '').valid, true);
    assert.strictEqual(validateStageTransition(Stage.SCREENING, Stage.VERIFIED, '', [{ required: true, status: 'VERIFIED' }]).valid, true);
    assert.strictEqual(validateStageTransition(Stage.VERIFIED, Stage.INTERVIEW, '').valid, true);
    assert.strictEqual(validateStageTransition(Stage.INTERVIEW, Stage.ONBOARDED, '').valid, true);
  });

  it('rejects skipping stages forward (e.g. Applied directly to Verified or Onboarded)', () => {
    const res1 = validateStageTransition(Stage.APPLIED, Stage.VERIFIED, '');
    assert.strictEqual(res1.valid, false);
    assert.match(res1.error, /Cannot skip stages/);

    const res2 = validateStageTransition(Stage.SCREENING, Stage.ONBOARDED, '');
    assert.strictEqual(res2.valid, false);
    assert.match(res2.error, /Cannot skip stages/);
  });

  it('requires a reason note when moving backward by one stage', () => {
    const resWithoutNote = validateStageTransition(Stage.SCREENING, Stage.APPLIED, '');
    assert.strictEqual(resWithoutNote.valid, false);
    assert.match(resWithoutNote.error, /note explaining the reason is required/i);

    const resWithNote = validateStageTransition(Stage.SCREENING, Stage.APPLIED, 'Need more documents from candidate');
    assert.strictEqual(resWithNote.valid, true);
  });

  it('rejects moving backward by more than one stage', () => {
    const res = validateStageTransition(Stage.VERIFIED, Stage.APPLIED, 'Resetting entire application');
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /Cannot move backward by more than one stage/i);
  });

  it('enforces reason note when rejecting a candidate from any stage', () => {
    const resWithoutNote = validateStageTransition(Stage.APPLIED, Stage.REJECTED, '');
    assert.strictEqual(resWithoutNote.valid, false);
    assert.match(resWithoutNote.error, /reason note is required/i);

    const resWithNote = validateStageTransition(Stage.APPLIED, Stage.REJECTED, 'Candidate declined offer');
    assert.strictEqual(resWithNote.valid, true);
  });

  it('allows reopening rejected candidate ONLY to Screening stage and requires a note', () => {
    const invalidReopen = validateStageTransition(Stage.REJECTED, Stage.INTERVIEW, 'Reopening for interview');
    assert.strictEqual(invalidReopen.valid, false);
    assert.match(invalidReopen.error, /only be reopened to the Screening stage/i);

    const validReopenWithoutNote = validateStageTransition(Stage.REJECTED, Stage.SCREENING, '');
    assert.strictEqual(validReopenWithoutNote.valid, false);
    assert.match(validReopenWithoutNote.error, /reason note is required when reopening/i);

    const validReopenWithNote = validateStageTransition(Stage.REJECTED, Stage.SCREENING, 'Candidate provided updated nursing license');
    assert.strictEqual(validReopenWithNote.valid, true);
  });

  it('blocks advancing to Verified stage if required checklist items are pending or rejected', () => {
    const incompleteChecklist = [
      { code: 'ID_MATCH', required: true, status: 'VERIFIED' },
      { code: 'CERT_GENUINE', required: true, status: 'PENDING' }, // Still pending
    ];

    const res = validateStageTransition(Stage.SCREENING, Stage.VERIFIED, '', incompleteChecklist);
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /required checklist items are not yet verified/i);
  });

  it('allows advancing to Verified stage once all required checklist items are verified', () => {
    const completeChecklist = [
      { code: 'ID_MATCH', required: true, status: 'VERIFIED' },
      { code: 'CERT_GENUINE', required: true, status: 'VERIFIED' },
      { code: 'OPTIONAL_CHECK', required: false, status: 'PENDING' }, // Optional item can be pending
    ];

    const res = validateStageTransition(Stage.SCREENING, Stage.VERIFIED, '', completeChecklist);
    assert.strictEqual(res.valid, true);
  });
});
