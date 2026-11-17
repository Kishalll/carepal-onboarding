import { Request, Response } from 'express';
import { prisma, applicationSchema, normalizeIndianPhone } from '@carepal/shared';
import { Qualification, Stage, VerificationStatus } from '@prisma/client';

export async function submitApplication(req: Request, res: Response): Promise<void> {
  // 1. Honeypot check: If the hidden honeypot field has a value, silently reject bot
  if (req.body?.website_hp && String(req.body.website_hp).trim().length > 0) {
    res.status(200).json({
      success: true,
      applicationId: 'CP-2026-000000',
      message: 'Application received',
    });
    return;
  }

  // 2. Validate input schema with Zod
  const validation = applicationSchema.safeParse(req.body);
  if (!validation.success) {
    const formattedErrors = validation.error.format();
    res.status(400).json({
      error: 'validation_error',
      message: 'Please review and correct the errors on the form.',
      details: formattedErrors,
    });
    return;
  }

  const data = validation.data;
  const normalizedPhone = normalizeIndianPhone(data.phone);

  if (!normalizedPhone) {
    res.status(400).json({
      error: 'invalid_phone',
      message: 'Please enter a valid 10-digit Indian mobile number.',
    });
    return;
  }

  try {
    // 3. Duplicate mobile phone check
    const existing = await prisma.candidate.findUnique({
      where: { phone: normalizedPhone },
      select: { id: true, stage: true },
    });

    if (existing) {
      res.status(409).json({
        error: 'duplicate_phone',
        message:
          'An application with this mobile number is already in our system. Our team is currently reviewing it.',
      });
      return;
    }

    // 4. Generate readable application ID sequence
    const count = await prisma.candidate.count();
    const applicationId = `CP-2026-${String(count + 1).padStart(6, '0')}`;

    // 5. Database transaction: Candidate + Checklist items + Stage history + Email log
    const candidate = await prisma.$transaction(async (tx) => {
      // Find admin user for attribution
      const adminUser = await tx.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true, name: true },
      });
      const adminId = adminUser?.id || 'system';
      const adminName = adminUser?.name || 'System Application Flow';

      const newCandidate = await tx.candidate.create({
        data: {
          applicationId,
          fullName: data.fullName,
          phone: normalizedPhone,
          email: data.email.toLowerCase(),
          dateOfBirth: new Date(data.dateOfBirth),
          city: data.city,
          preferredLanguage: data.preferredLanguage,
          qualification: data.qualification as Qualification,
          councilRegistrationNumber: data.councilRegistrationNumber || null,
          experienceYears: data.experienceYears,
          previousWorkNote: data.previousWorkNote || null,
          skills: data.skills,
          languages: data.languages,
          preferredCities: data.preferredCities,
          availabilityType: data.availabilityType,
          earliestStartDate: new Date(data.earliestStartDate),
          stage: Stage.APPLIED,
          consentGiven: true,
        },
      });

      // Checklist template generation
      const isNurse = data.qualification !== 'TRAINED_CAREGIVER';
      const checklistDefs = [
        { code: 'ID_MATCH', label: 'ID proof matches applicant name', required: true },
        { code: 'PHOTO_CLEAR', label: 'Photo is clear and recent', required: true },
        { code: 'CERT_GENUINE', label: 'Qualification certificate is genuine', required: true },
        ...(isNurse
          ? [{ code: 'COUNCIL_REG', label: 'Nursing council registration verified', required: true }]
          : []),
        { code: 'EXP_CHECK', label: 'Experience claims checked', required: true },
        { code: 'REF_CALL', label: 'Reference verification call completed', required: true },
      ];

      for (const def of checklistDefs) {
        await tx.checklistItem.create({
          data: {
            candidateId: newCandidate.id,
            code: def.code,
            label: def.label,
            required: def.required,
            status: VerificationStatus.PENDING,
          },
        });
      }

      // Initial stage history
      await tx.stageHistory.create({
        data: {
          candidateId: newCandidate.id,
          fromStage: Stage.APPLIED,
          toStage: Stage.APPLIED,
          reasonNote: 'Application submitted successfully via careers portal.',
          changedById: adminId,
          changedByName: adminName,
        },
      });

      // Initial confirmation email log
      await tx.emailLog.create({
        data: {
          candidateId: newCandidate.id,
          recipientEmail: newCandidate.email,
          stage: Stage.APPLIED,
          subject: 'TheCarePal: Application Received',
          status: 'SENT',
        },
      });

      return newCandidate;
    });

    res.status(201).json({
      success: true,
      applicationId: candidate.applicationId,
      fullName: candidate.fullName,
      city: candidate.city,
      message: 'Application submitted successfully.',
    });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({
        error: 'duplicate_phone',
        message:
          'An application with this mobile number is already in our system. Our team is currently reviewing it.',
      });
      return;
    }
    console.error('Application submission error:', err);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to process application. Please try again.',
    });
  }
}
