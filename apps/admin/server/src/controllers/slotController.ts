import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma, sendStageEmail } from '@carepal/shared';
import { InterviewMode, Stage } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * List all interview slots with optional filters for status and mode.
 * GET /api/slots?status=all|available|booked&mode=VIDEO|IN_PERSON|PHONE
 */
export async function getSlots(req: Request, res: Response): Promise<void> {
  try {
    const { status, mode } = req.query;

    const whereClause: Record<string, unknown> = {};

    if (status === 'available') {
      whereClause.candidateId = null;
    } else if (status === 'booked') {
      whereClause.candidateId = { not: null };
    }

    if (mode && Object.values(InterviewMode).includes(mode as InterviewMode)) {
      whereClause.mode = mode as InterviewMode;
    }

    const [slots, totalCount, availableCount, bookedCount] = await Promise.all([
      prisma.interviewSlot.findMany({
        where: whereClause,
        include: {
          candidate: {
            select: {
              id: true,
              applicationId: true,
              fullName: true,
              email: true,
              phone: true,
              stage: true,
              city: true,
              qualification: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      }),
      prisma.interviewSlot.count(),
      prisma.interviewSlot.count({ where: { candidateId: null } }),
      prisma.interviewSlot.count({ where: { candidateId: { not: null } } }),
    ]);

    res.json({
      slots,
      metrics: {
        total: totalCount,
        available: availableCount,
        booked: bookedCount,
      },
    });
  } catch (err) {
    console.error('Error fetching interview slots:', err);
    res.status(500).json({ error: 'Failed to fetch interview slots' });
  }
}

/**
 * Create a new interview slot.
 * POST /api/slots
 */
export async function createSlot(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { startTime, endTime, interviewerName, mode } = req.body;

    if (!startTime || !endTime || !interviewerName) {
      res.status(400).json({ error: 'Start time, end time, and interviewer name are required' });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid date/time format provided' });
      return;
    }

    if (end <= start) {
      res.status(400).json({ error: 'End time must be after start time' });
      return;
    }

    const interviewMode = Object.values(InterviewMode).includes(mode)
      ? (mode as InterviewMode)
      : InterviewMode.VIDEO;

    const trimmedInterviewer = interviewerName.trim();

    // Check for scheduling conflict: another slot for this interviewer overlapping the time window
    const existingConflict = await prisma.interviewSlot.findFirst({
      where: {
        interviewerName: {
          equals: trimmedInterviewer,
          mode: 'insensitive',
        },
        startTime: {
          lt: end,
        },
        endTime: {
          gt: start,
        },
      },
    });

    if (existingConflict) {
      const conflictStart = new Date(existingConflict.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const conflictEnd = new Date(existingConflict.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      res.status(409).json({
        error: 'interviewer_schedule_conflict',
        message: `${trimmedInterviewer} already has a meeting scheduled between ${conflictStart} and ${conflictEnd}. Please choose a different time or interviewer.`,
      });
      return;
    }

    const bookingToken = `slot-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

    const newSlot = await prisma.interviewSlot.create({
      data: {
        startTime: start,
        endTime: end,
        interviewerName: trimmedInterviewer,
        mode: interviewMode,
        bookingToken,
      },
    });

    res.status(201).json({
      success: true,
      slot: newSlot,
    });
  } catch (err) {
    console.error('Error creating interview slot:', err);
    res.status(500).json({ error: 'Failed to create interview slot' });
  }
}

/**
 * Delete an unbooked interview slot.
 * DELETE /api/slots/:id
 */
export async function deleteSlot(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const slot = await prisma.interviewSlot.findUnique({
      where: { id },
    });

    if (!slot) {
      res.status(404).json({ error: 'Interview slot not found' });
      return;
    }

    if (slot.candidateId) {
      res.status(400).json({
        error: 'Cannot delete a booked slot. Please unassign candidate before deleting.',
      });
      return;
    }

    await prisma.interviewSlot.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Interview slot deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting interview slot:', err);
    res.status(500).json({ error: 'Failed to delete interview slot' });
  }
}

/**
 * Manually assign a candidate to a slot.
 * POST /api/slots/:id/assign
 */
export async function assignSlot(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { candidateId } = req.body;

    if (!candidateId) {
      res.status(400).json({ error: 'candidateId is required' });
      return;
    }

    const [slot, candidate] = await Promise.all([
      prisma.interviewSlot.findUnique({ where: { id } }),
      prisma.candidate.findFirst({
        where: {
          OR: [{ id: candidateId }, { applicationId: candidateId }],
        },
      }),
    ]);

    if (!slot) {
      res.status(404).json({ error: 'Interview slot not found' });
      return;
    }

    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    if (slot.candidateId && slot.candidateId !== candidate.id) {
      res.status(409).json({ error: 'Slot is already booked by another candidate' });
      return;
    }

    // Atomic update
    const updatedSlot = await prisma.$transaction(async (tx) => {
      // Remove any previously booked slot for this candidate
      await tx.interviewSlot.updateMany({
        where: { candidateId: candidate.id, id: { not: id } },
        data: { candidateId: null, bookedAt: null },
      });

      // Assign target slot
      const assigned = await tx.interviewSlot.update({
        where: { id },
        data: {
          candidateId: candidate.id,
          bookedAt: new Date(),
        },
        include: {
          candidate: true,
        },
      });

      // Record timeline note
      const adminName = req.user?.name || 'Operations Admin';
      const formattedDate = new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(assigned.startTime);

      const systemUser = await tx.user.findFirst({ select: { id: true } });
      const adminUserId = req.user?.id || systemUser?.id || '';

      await tx.note.create({
        data: {
          candidateId: candidate.id,
          authorId: adminUserId,
          authorName: adminName,
          content: `Interview scheduled manually with ${assigned.interviewerName} on ${formattedDate} (${assigned.mode}).`,
        },
      });

      return assigned;
    });

    // Send confirmation email
    sendStageEmail({
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      recipientEmail: candidate.email,
      stage: Stage.INTERVIEW,
      preferredLanguage: candidate.preferredLanguage,
      applicationId: candidate.applicationId,
      interviewDetails: {
        startTime: updatedSlot.startTime,
        interviewerName: updatedSlot.interviewerName,
        mode: updatedSlot.mode,
      },
    }).catch((emailErr: unknown) => {
      console.error('[Slot Assignment Email Error] Non-blocking dispatch failed:', emailErr);
    });

    res.json({
      success: true,
      slot: updatedSlot,
    });
  } catch (err) {
    console.error('Error assigning candidate to slot:', err);
    res.status(500).json({ error: 'Failed to assign candidate to slot' });
  }
}

/**
 * Unassign a candidate from a slot.
 * POST /api/slots/:id/unassign
 */
export async function unassignSlot(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const slot = await prisma.interviewSlot.findUnique({
      where: { id },
      include: { candidate: true },
    });

    if (!slot) {
      res.status(404).json({ error: 'Interview slot not found' });
      return;
    }

    if (!slot.candidateId) {
      res.status(400).json({ error: 'Slot is not currently assigned to any candidate' });
      return;
    }

    const previousCandidate = slot.candidate;

    const updatedSlot = await prisma.$transaction(async (tx) => {
      const cleared = await tx.interviewSlot.update({
        where: { id },
        data: {
          candidateId: null,
          bookedAt: null,
        },
      });

      if (previousCandidate) {
        const systemUser = await tx.user.findFirst({ select: { id: true } });
        const adminUserId = req.user?.id || systemUser?.id || '';

        await tx.note.create({
          data: {
            candidateId: previousCandidate.id,
            authorId: adminUserId,
            authorName: req.user?.name || 'Operations Admin',
            content: `Interview slot on ${new Intl.DateTimeFormat('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(slot.startTime)} was cancelled/unassigned.`,
          },
        });
      }

      return cleared;
    });

    res.json({
      success: true,
      slot: updatedSlot,
    });
  } catch (err) {
    console.error('Error unassigning slot:', err);
    res.status(500).json({ error: 'Failed to unassign slot' });
  }
}
