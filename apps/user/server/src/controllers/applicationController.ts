import { Request, Response } from 'express';
import path from 'node:path';
import {
  prisma,
  applicationSchema,
  normalizeIndianPhone,
  storageAdapter,
  validateDocumentFile,
  sendStageEmail,
} from '@carepal/shared';
import { Qualification, Stage, VerificationStatus, DocumentCategory } from '@prisma/client';

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

  // 2. Normalize and parse potential FormData fields
  const rawBody = { ...req.body };
  if (typeof rawBody.skills === 'string') {
    try {
      rawBody.skills = JSON.parse(rawBody.skills);
    } catch {
      // Keep as-is if parsing fails
    }
  }
  if (typeof rawBody.languages === 'string') {
    try {
      rawBody.languages = JSON.parse(rawBody.languages);
    } catch {
      // Keep as-is
    }
  }
  if (typeof rawBody.preferredCities === 'string') {
    try {
      rawBody.preferredCities = JSON.parse(rawBody.preferredCities);
    } catch {
      // Keep as-is
    }
  }
  if (rawBody.experienceYears !== undefined) {
    rawBody.experienceYears = Number(rawBody.experienceYears);
  }
  if (typeof rawBody.consentGiven === 'string') {
    rawBody.consentGiven = rawBody.consentGiven === 'true';
  }

  // 3. Validate input schema with Zod
  const validation = applicationSchema.safeParse(rawBody);
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

  // 4. Validate any attached multipart files
  const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const idProofFiles = filesMap?.idProof || [];
  const photoFiles = filesMap?.photo || [];
  const certificateFiles = filesMap?.certificates || [];

  const filesToProcess: {
    file: Express.Multer.File;
    category: DocumentCategory;
    idType?: string;
  }[] = [];

  if (idProofFiles.length > 0) {
    filesToProcess.push({
      file: idProofFiles[0],
      category: DocumentCategory.ID_PROOF,
      idType: (req.body.idType as string) || 'AADHAAR',
    });
  }
  if (photoFiles.length > 0) {
    filesToProcess.push({
      file: photoFiles[0],
      category: DocumentCategory.PHOTO,
    });
  }
  for (const certFile of certificateFiles) {
    filesToProcess.push({
      file: certFile,
      category: DocumentCategory.CERTIFICATE,
    });
  }

  for (const item of filesToProcess) {
    const fileVal = validateDocumentFile(item.file);
    if (!fileVal.valid) {
      res.status(400).json({
        error: 'invalid_file',
        message: `${item.file.originalname}: ${fileVal.error}`,
      });
      return;
    }
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

      // Persist attached documents if provided
      for (const item of filesToProcess) {
        const ext = path.extname(item.file.originalname).toLowerCase();
        const sanitizedBase = path
          .basename(item.file.originalname, ext)
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 40);
        const storageKey = `${newCandidate.id}/${item.category.toLowerCase()}_${Date.now()}_${sanitizedBase}${ext}`;

        await storageAdapter.save(storageKey, item.file.buffer);

        await tx.document.create({
          data: {
            candidateId: newCandidate.id,
            category: item.category,
            idType: item.category === DocumentCategory.ID_PROOF ? item.idType || 'AADHAAR' : null,
            storageKey,
            originalName: item.file.originalname,
            mimeType: item.file.mimetype,
            sizeBytes: item.file.size,
            status: VerificationStatus.PENDING,
          },
        });
      }

      return newCandidate;
    });

    // Non-blocking confirmation email dispatch
    sendStageEmail({
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      recipientEmail: candidate.email,
      stage: Stage.APPLIED,
      preferredLanguage: candidate.preferredLanguage,
      applicationId: candidate.applicationId,
    }).catch((emailErr) => {
      console.error('[Application Email Error] Non-blocking email dispatch failed:', emailErr);
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
