import { describe, it } from 'node:test';
import assert from 'node:assert';

function checkSlotConflict(existingSlots, newSlot) {
  const newStart = new Date(newSlot.startTime).getTime();
  const newEnd = new Date(newSlot.endTime).getTime();
  const trimmedNewInterviewer = newSlot.interviewerName.trim().toLowerCase();

  for (const existing of existingSlots) {
    const existingInterviewer = existing.interviewerName.trim().toLowerCase();
    if (existingInterviewer !== trimmedNewInterviewer) {
      continue;
    }

    const existStart = new Date(existing.startTime).getTime();
    const existEnd = new Date(existing.endTime).getTime();

    // Overlap condition: start < existing.endTime && end > existing.startTime
    if (newStart < existEnd && newEnd > existStart) {
      return {
        conflict: true,
        conflictingSlot: existing,
      };
    }
  }

  return { conflict: false };
}

describe('Unit: Interview Slot Conflict Prevention', () => {
  const existingSlots = [
    {
      id: 'slot-1',
      interviewerName: 'Dr. Kavitha S. (Clinical Lead)',
      startTime: '2026-11-25T10:00:00.000Z',
      endTime: '2026-11-25T10:45:00.000Z',
    },
    {
      id: 'slot-2',
      interviewerName: 'Dr. Anand Verma',
      startTime: '2026-11-25T11:00:00.000Z',
      endTime: '2026-11-25T11:45:00.000Z',
    },
  ];

  it('detects conflict when new slot overlaps partially with existing slot for same interviewer', () => {
    // 10:30 to 11:15 overlaps with 10:00 to 10:45
    const res = checkSlotConflict(existingSlots, {
      interviewerName: 'Dr. Kavitha S. (Clinical Lead)',
      startTime: '2026-11-25T10:30:00.000Z',
      endTime: '2026-11-25T11:15:00.000Z',
    });
    assert.strictEqual(res.conflict, true);
    assert.strictEqual(res.conflictingSlot.id, 'slot-1');
  });

  it('detects conflict when new slot is inside existing slot for same interviewer', () => {
    // 10:10 to 10:40 is completely inside 10:00 to 10:45
    const res = checkSlotConflict(existingSlots, {
      interviewerName: 'Dr. Kavitha S. (Clinical Lead)',
      startTime: '2026-11-25T10:10:00.000Z',
      endTime: '2026-11-25T10:40:00.000Z',
    });
    assert.strictEqual(res.conflict, true);
  });

  it('matches interviewer names case-insensitively and with trimmed whitespace', () => {
    const res = checkSlotConflict(existingSlots, {
      interviewerName: '  dr. kavitha s. (clinical lead)  ',
      startTime: '2026-11-25T10:15:00.000Z',
      endTime: '2026-11-25T11:00:00.000Z',
    });
    assert.strictEqual(res.conflict, true);
  });

  it('allows adjacent/back-to-back slots for the same interviewer', () => {
    // Exactly starts when previous ends (10:45)
    const res = checkSlotConflict(existingSlots, {
      interviewerName: 'Dr. Kavitha S. (Clinical Lead)',
      startTime: '2026-11-25T10:45:00.000Z',
      endTime: '2026-11-25T11:30:00.000Z',
    });
    assert.strictEqual(res.conflict, false);
  });

  it('allows same time slot for a DIFFERENT interviewer', () => {
    // Same time as Dr. Kavitha (10:00 to 10:45) but for Dr. Anand Verma
    const res = checkSlotConflict(existingSlots, {
      interviewerName: 'Dr. Anand Verma',
      startTime: '2026-11-25T10:00:00.000Z',
      endTime: '2026-11-25T10:45:00.000Z',
    });
    assert.strictEqual(res.conflict, false);
  });
});
