import { Request, Response } from 'express';
import { prisma, sendStageEmail } from '@carepal/shared';
import { Stage } from '@prisma/client';

/**
 * Helper to resolve candidate by various token patterns:
 * 1. candidate.applicationId (e.g. APP-2026-XXXXX)
 * 2. candidate.id (uuid)
 * 3. slot-token-${candidate.applicationId}
 * 4. slot bookingToken
 */
async function resolveCandidateByToken(token: string) {
  if (!token) return null;

  // Pattern 1: Direct application ID or UUID
  let candidate = await prisma.candidate.findFirst({
    where: {
      OR: [
        { applicationId: token },
        { id: token },
      ],
    },
    include: {
      interviewSlot: true,
    },
  });

  if (candidate) return candidate;

  // Pattern 2: slot-token-${applicationId}
  if (token.startsWith('slot-token-')) {
    const appId = token.replace('slot-token-', '');
    candidate = await prisma.candidate.findUnique({
      where: { applicationId: appId },
      include: {
        interviewSlot: true,
      },
    });
    if (candidate) return candidate;
  }

  // Pattern 3: bookingToken on an InterviewSlot
  const slot = await prisma.interviewSlot.findUnique({
    where: { bookingToken: token },
    include: {
      candidate: {
        include: {
          interviewSlot: true,
        },
      },
    },
  });

  if (slot?.candidate) {
    return slot.candidate;
  }

  return null;
}

/**
 * Get candidate details and list of available interview slots.
 * GET /api/booking/:token
 */
export async function getBookingDetails(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    const candidate = await resolveCandidateByToken(token);

    if (!candidate) {
      // Check if token is a direct slot booking token
      const slot = await prisma.interviewSlot.findUnique({
        where: { bookingToken: token },
        include: {
          candidate: {
            include: { interviewSlot: true },
          },
        },
      });

      if (slot) {
        if (slot.candidate) {
          res.json({
            isBooked: true,
            candidate: {
              id: slot.candidate.id,
              applicationId: slot.candidate.applicationId,
              fullName: slot.candidate.fullName,
              city: slot.candidate.city,
              qualification: slot.candidate.qualification,
              preferredLanguage: slot.candidate.preferredLanguage,
            },
            existingBooking: slot,
          });
          return;
        }

        // Slot is available for booking
        res.json({
          isBooked: false,
          isSlotToken: true,
          candidate: null,
          targetSlot: slot,
          availableSlots: [slot],
        });
        return;
      }

      res.status(404).json({
        error: 'invalid_token',
        message: 'This interview booking invitation link is invalid or has expired.',
      });
      return;
    }

    // Candidate should be in INTERVIEW stage (or ONBOARDED if viewing past booking)
    if (candidate.stage !== Stage.INTERVIEW && candidate.stage !== Stage.ONBOARDED && !candidate.interviewSlot) {
      res.status(400).json({
        error: 'stage_ineligible',
        message: 'Your application is not currently in the Interview stage.',
      });
      return;
    }

    // Check if already booked
    if (candidate.interviewSlot) {
      res.json({
        isBooked: true,
        candidate: {
          id: candidate.id,
          applicationId: candidate.applicationId,
          fullName: candidate.fullName,
          city: candidate.city,
          qualification: candidate.qualification,
          preferredLanguage: candidate.preferredLanguage,
        },
        existingBooking: candidate.interviewSlot,
      });
      return;
    }

    // Fetch all future available slots
    const availableSlots = await prisma.interviewSlot.findMany({
      where: {
        candidateId: null,
        startTime: {
          gt: new Date(),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    res.json({
      isBooked: false,
      candidate: {
        id: candidate.id,
        applicationId: candidate.applicationId,
        fullName: candidate.fullName,
        city: candidate.city,
        qualification: candidate.qualification,
        preferredLanguage: candidate.preferredLanguage,
      },
      availableSlots,
    });
  } catch (err) {
    console.error('Error in getBookingDetails:', err);
    res.status(500).json({ error: 'Failed to retrieve booking information' });
  }
}

/**
 * Candidate books an available interview slot atomically.
 * POST /api/booking/:token
 */
export async function bookSlot(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    const { slotId, candidateIdentifier } = req.body;

    let candidate = await resolveCandidateByToken(token);

    // If token is a direct slot token, resolve candidate via candidateIdentifier
    if (!candidate && candidateIdentifier) {
      const cleanIdent = String(candidateIdentifier).trim();
      const cleanedPhone = cleanIdent.replace(/[\s\-()]/g, '');
      candidate = await prisma.candidate.findFirst({
        where: {
          OR: [
            { applicationId: cleanIdent },
            { email: cleanIdent.toLowerCase() },
            { phone: cleanedPhone },
            { phone: cleanIdent },
          ],
        },
        include: { interviewSlot: true },
      });
    }

    if (!candidate) {
      res.status(400).json({
        error: 'candidate_required',
        message: 'Please provide your Application ID or registered mobile number to confirm this slot.',
      });
      return;
    }

    if (candidate.stage !== Stage.INTERVIEW && candidate.stage !== Stage.ONBOARDED) {
      res.status(400).json({
        error: 'stage_ineligible',
        message: 'Only candidates in the Interview stage can book an appointment.',
      });
      return;
    }

    // Determine target slot ID
    let targetSlotId = slotId;
    if (!targetSlotId) {
      const slotByToken = await prisma.interviewSlot.findUnique({
        where: { bookingToken: token },
      });
      if (slotByToken) targetSlotId = slotByToken.id;
    }

    if (!targetSlotId) {
      res.status(400).json({ error: 'slotId is required to book an interview' });
      return;
    }

    // Atomic transaction for concurrency safety
    let bookedSlot;
    try {
      bookedSlot = await prisma.$transaction(async (tx) => {
        // 1. Check if candidate already has an appointment
        const existing = await tx.interviewSlot.findFirst({
          where: { candidateId: candidate.id },
        });

        if (existing) {
          throw new Error('ALREADY_BOOKED');
        }

        // 2. Atomically claim the slot with candidateId: null condition
        const claimResult = await tx.interviewSlot.updateMany({
          where: {
            id: targetSlotId,
            candidateId: null,
            startTime: { gt: new Date() },
          },
          data: {
            candidateId: candidate.id,
            bookedAt: new Date(),
          },
        });

        if (claimResult.count === 0) {
          const currentSlot = await tx.interviewSlot.findUnique({
            where: { id: targetSlotId },
          });
          if (!currentSlot) {
            throw new Error('SLOT_NOT_FOUND');
          }
          if (currentSlot.candidateId !== null) {
            throw new Error('SLOT_CONFLICT');
          }
          if (currentSlot.startTime <= new Date()) {
            throw new Error('SLOT_IN_PAST');
          }
          throw new Error('SLOT_CONFLICT');
        }

        const updated = await tx.interviewSlot.findUniqueOrThrow({
          where: { id: targetSlotId },
        });

        // 4. Record candidate note for audit trail
        const dateStr = new Intl.DateTimeFormat('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(updated.startTime);

        const systemUser = await tx.user.findFirst({
          select: { id: true },
        });

        if (systemUser) {
          await tx.note.create({
            data: {
              candidateId: candidate.id,
              authorId: systemUser.id,
              authorName: 'Candidate Self-Service',
              content: `Candidate booked an interview appointment for ${dateStr} with ${updated.interviewerName} (${updated.mode}).`,
            },
          });
        }

        return updated;
      });
    } catch (txErr: unknown) {
      const msg = txErr instanceof Error ? txErr.message : String(txErr);
      if (msg === 'SLOT_CONFLICT') {
        res.status(409).json({
          error: 'slot_already_taken',
          message: 'This interview slot was just booked by another candidate. Please select an alternate time.',
        });
        return;
      }
      if (msg === 'ALREADY_BOOKED') {
        res.status(400).json({
          error: 'already_booked',
          message: 'You have already booked an interview appointment.',
        });
        return;
      }
      if (msg === 'SLOT_NOT_FOUND') {
        res.status(404).json({ error: 'Interview slot not found' });
        return;
      }
      if (msg === 'SLOT_IN_PAST') {
        res.status(400).json({ error: 'This time slot is in the past. Please choose a future slot.' });
        return;
      }
      throw txErr;
    }

    // 5. Send confirmation email to candidate
    sendStageEmail({
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      recipientEmail: candidate.email,
      stage: Stage.INTERVIEW,
      preferredLanguage: candidate.preferredLanguage,
      applicationId: candidate.applicationId,
      interviewDetails: {
        startTime: bookedSlot.startTime,
        interviewerName: bookedSlot.interviewerName,
        mode: bookedSlot.mode,
      },
    }).catch((emailErr: unknown) => {
      console.error('[Booking Email Error] Non-blocking dispatch failed:', emailErr);
    });

    res.json({
      success: true,
      booking: bookedSlot,
    });
  } catch (err) {
    console.error('Error booking slot:', err);
    res.status(500).json({ error: 'Failed to confirm interview booking' });
  }
}
