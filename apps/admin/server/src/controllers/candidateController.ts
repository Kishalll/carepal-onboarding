import { Request, Response } from 'express';
import path from 'node:path';
import {
  prisma,
  storageAdapter,
  Prisma,
  Stage,
  Qualification,
  AvailabilityType,
  VerificationStatus,
  sendStageEmail,
  resendEmailLog,
} from '@carepal/shared';
import { AuthenticatedRequest } from '../middleware/auth.js';

function parseArrayParam(param: unknown): string[] {
  if (!param) return [];
  if (Array.isArray(param)) {
    return param
      .map(String)
      .flatMap((s) => s.split(','))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof param === 'string') {
    return param
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function buildCandidateWhere(query: Request['query']): Prisma.CandidateWhereInput {
  const andConditions: Prisma.CandidateWhereInput[] = [];

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search) {
    andConditions.push({
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { applicationId: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  const cities = parseArrayParam(query.city);
  if (cities.length > 0) {
    andConditions.push({ city: { in: cities } });
  }

  const qualifications = parseArrayParam(query.qualification);
  if (qualifications.length > 0) {
    andConditions.push({ qualification: { in: qualifications as Qualification[] } });
  }

  const stages = parseArrayParam(query.stage);
  if (stages.length > 0) {
    andConditions.push({ stage: { in: stages as Stage[] } });
  }

  const availabilities = parseArrayParam(query.availability);
  if (availabilities.length > 0) {
    andConditions.push({ availabilityType: { in: availabilities as AvailabilityType[] } });
  }

  const languages = parseArrayParam(query.language);
  if (languages.length > 0) {
    andConditions.push({ languages: { hasSome: languages } });
  }

  const skills = parseArrayParam(query.skill);
  if (skills.length > 0) {
    andConditions.push({ skills: { hasSome: skills } });
  }

  if (query.minExperience) {
    const minExp = parseInt(String(query.minExperience), 10);
    if (!isNaN(minExp) && minExp > 0) {
      andConditions.push({ experienceYears: { gte: minExp } });
    }
  }

  return andConditions.length > 0 ? { AND: andConditions } : {};
}

export async function getCandidates(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || 10), 10)));
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'fullName', 'stage', 'experienceYears', 'stageUpdatedAt'];
    const sortBy = allowedSortFields.includes(String(req.query.sortBy))
      ? String(req.query.sortBy)
      : 'createdAt';
    const sortOrder: 'asc' | 'desc' = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where = buildCandidateWhere(req.query);

    const [total, candidates] = await Promise.all([
      prisma.candidate.count({ where }),
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          documents: {
            select: {
              id: true,
              category: true,
              status: true,
            },
          },
          checklistItems: {
            select: {
              id: true,
              status: true,
              required: true,
            },
          },
        },
      }),
    ]);

    const items = candidates.map((c) => {
      const totalDocs = c.documents.length;
      const verifiedDocs = c.documents.filter((d) => d.status === 'VERIFIED').length;
      const totalChecklist = c.checklistItems.length;
      const verifiedChecklist = c.checklistItems.filter((chk) => chk.status === 'VERIFIED').length;
      const daysInStage = Math.max(
        0,
        Math.floor((Date.now() - new Date(c.stageUpdatedAt).getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        id: c.id,
        applicationId: c.applicationId,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email,
        city: c.city,
        preferredLanguage: c.preferredLanguage,
        qualification: c.qualification,
        councilRegistrationNumber: c.councilRegistrationNumber,
        experienceYears: c.experienceYears,
        skills: c.skills,
        languages: c.languages,
        availabilityType: c.availabilityType,
        earliestStartDate: c.earliestStartDate,
        stage: c.stage,
        stageUpdatedAt: c.stageUpdatedAt,
        createdAt: c.createdAt,
        daysInStage,
        stats: {
          totalDocs,
          verifiedDocs,
          totalChecklist,
          verifiedChecklist,
        },
      };
    });

    res.json({
      candidates: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error('Error fetching candidates:', err);
    res.status(500).json({ error: 'Failed to retrieve candidates' });
  }
}

export async function exportCandidatesCsv(req: Request, res: Response): Promise<void> {
  try {
    const where = buildCandidateWhere(req.query);

    const candidates = await prisma.candidate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const headers = [
      'Application ID',
      'Full Name',
      'Phone',
      'Email',
      'City',
      'Qualification',
      'Experience (Years)',
      'Availability',
      'Stage',
      'Preferred Language',
      'Languages',
      'Skills',
      'Applied Date',
    ];

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = candidates.map((c) => [
      escapeCsv(c.applicationId),
      escapeCsv(c.fullName),
      escapeCsv(c.phone),
      escapeCsv(c.email),
      escapeCsv(c.city),
      escapeCsv(c.qualification),
      escapeCsv(c.experienceYears),
      escapeCsv(c.availabilityType),
      escapeCsv(c.stage),
      escapeCsv(c.preferredLanguage),
      escapeCsv(c.languages.join(', ')),
      escapeCsv(c.skills.join(', ')),
      escapeCsv(new Date(c.createdAt).toISOString().split('T')[0]),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="carepal-candidates-${dateStr}.csv"`
    );
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting candidates CSV:', err);
    res.status(500).json({ error: 'Failed to export candidates CSV' });
  }
}

export async function getCandidateById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [{ id }, { applicationId: id }],
      },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        checklistItems: {
          orderBy: { updatedAt: 'asc' },
        },
        notes: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        stageHistory: {
          include: {
            changedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        interviewSlot: true,
        emailLogs: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    const docsWithSignedUrls = candidate.documents.map((doc) => ({
      ...doc,
      viewUrl: storageAdapter.generateSignedUrl(doc.storageKey, 15),
    }));

    const daysInStage = Math.max(
      0,
      Math.floor((Date.now() - new Date(candidate.stageUpdatedAt).getTime()) / (1000 * 60 * 60 * 24))
    );

    res.json({
      ...candidate,
      daysInStage,
      documents: docsWithSignedUrls,
    });
  } catch (err) {
    console.error('Error fetching candidate detail:', err);
    res.status(500).json({ error: 'Failed to retrieve candidate profile' });
  }
}

export async function getDocumentViewLink(req: Request, res: Response): Promise<void> {
  const { id, docId } = req.params;

  try {
    const doc = await prisma.document.findFirst({
      where: {
        id: docId,
        candidateId: id,
      },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found for candidate' });
      return;
    }

    const url = storageAdapter.generateSignedUrl(doc.storageKey, 15);
    res.json({ url, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
  } catch (err) {
    console.error('Error generating document link:', err);
    res.status(500).json({ error: 'Failed to generate document link' });
  }
}

export async function streamDocument(req: Request, res: Response): Promise<void> {
  const { storageKey } = req.params;
  const { expires, sig } = req.query;

  if (!storageKey || !expires || !sig) {
    res.status(400).json({ error: 'Missing document signature parameters' });
    return;
  }

  const isValid = storageAdapter.verifySignedUrl(
    storageKey,
    parseInt(String(expires), 10),
    String(sig)
  );

  if (!isValid) {
    res.status(403).json({ error: 'Invalid or expired document signature link' });
    return;
  }

  const buffer = await storageAdapter.read(storageKey);
  if (!buffer) {
    res.status(404).json({ error: 'Document file not found on disk' });
    return;
  }

  const doc = await prisma.document.findFirst({
    where: { storageKey },
  });

  const mimeType = doc?.mimeType || 'application/octet-stream';
  const originalName = doc?.originalName || path.basename(storageKey);

  res.setHeader('Content-Type', mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(originalName)}"`
  );
  res.setHeader('Cache-Control', 'private, max-age=900');
  res.send(buffer);
}

const NORMAL_STAGE_ORDER: Stage[] = [
  Stage.APPLIED,
  Stage.SCREENING,
  Stage.VERIFIED,
  Stage.INTERVIEW,
  Stage.ONBOARDED,
];

export async function changeCandidateStage(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const { toStage, reasonNote } = req.body || {};

  if (!toStage || !Object.values(Stage).includes(toStage as Stage)) {
    res.status(400).json({ error: 'Valid target stage is required' });
    return;
  }

  const candidate = await prisma.candidate.findFirst({
    where: { OR: [{ id }, { applicationId: id }] },
    include: { checklistItems: true },
  });

  if (!candidate) {
    res.status(404).json({ error: 'Candidate not found' });
    return;
  }

  const fromStage = candidate.stage;
  const targetStage = toStage as Stage;
  const note = typeof reasonNote === 'string' ? reasonNote.trim() : '';

  if (fromStage === targetStage) {
    res.status(400).json({ error: `Candidate is already in ${targetStage} stage` });
    return;
  }

  // Rule 3: Moving to REJECTED requires a non-empty reason note
  if (targetStage === Stage.REJECTED) {
    if (!note) {
      res.status(400).json({ error: 'A reason note is required when rejecting a candidate' });
      return;
    }
  } else if (fromStage === Stage.REJECTED) {
    // Rule 4: Reopening from REJECTED is allowed only to SCREENING with a note
    if (targetStage !== Stage.SCREENING) {
      res.status(400).json({
        error: 'Rejected candidates can only be reopened to the Screening stage',
      });
      return;
    }
    if (!note) {
      res.status(400).json({
        error: 'A reason note is required when reopening a rejected candidate',
      });
      return;
    }
  } else {
    // Both fromStage and targetStage are in normal progression
    const fromIdx = NORMAL_STAGE_ORDER.indexOf(fromStage);
    const toIdx = NORMAL_STAGE_ORDER.indexOf(targetStage);

    if (fromIdx === -1 || toIdx === -1) {
      res.status(400).json({ error: `Invalid transition from ${fromStage} to ${targetStage}` });
      return;
    }

    const stepDiff = toIdx - fromIdx;

    if (stepDiff > 1) {
      res.status(400).json({
        error: `Cannot skip stages. Candidates must advance one stage at a time: ${fromStage} to ${NORMAL_STAGE_ORDER[fromIdx + 1]}`,
      });
      return;
    }

    if (stepDiff === -1) {
      if (!note) {
        res.status(400).json({
          error: 'A note explaining the reason is required when moving a candidate back to a previous stage',
        });
        return;
      }
    } else if (stepDiff < -1) {
      res.status(400).json({
        error: 'Cannot move backward by more than one stage at a time',
      });
      return;
    }

    // Rule 5: Stage gate for VERIFIED
    if (targetStage === Stage.VERIFIED) {
      const requiredItems = candidate.checklistItems.filter((item) => item.required);
      const unverifiedItems = requiredItems.filter((item) => item.status !== 'VERIFIED');

      if (unverifiedItems.length > 0) {
        res.status(400).json({
          error: `Cannot move candidate to Verified: ${unverifiedItems.length} required checklist item(s) are not verified yet.`,
          unverifiedItems: unverifiedItems.map((i) => i.label),
        });
        return;
      }
    }

    // Rule 6: ONBOARDED is allowed only from INTERVIEW
    if (targetStage === Stage.ONBOARDED && fromStage !== Stage.INTERVIEW) {
      res.status(400).json({
        error: 'Candidate can only be onboarded from the Interview stage',
      });
      return;
    }
  }

  const adminUserId = req.user?.id;
  if (!adminUserId) {
    res.status(401).json({ error: 'Authenticated admin user ID is required' });
    return;
  }

  try {
    const [updatedCandidate, stageHistory] = await prisma.$transaction([
      prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          stage: targetStage,
          stageUpdatedAt: new Date(),
        },
      }),
      prisma.stageHistory.create({
        data: {
          candidateId: candidate.id,
          fromStage,
          toStage: targetStage,
          reasonNote: note || null,
          changedById: adminUserId,
          changedByName: req.user?.name || 'Operations Admin',
        },
        include: {
          changedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      candidate: updatedCandidate,
      stageHistory,
    });

    // Non-blocking stage transition email dispatch
    sendStageEmail({
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      recipientEmail: candidate.email,
      stage: targetStage,
      preferredLanguage: candidate.preferredLanguage,
      applicationId: candidate.applicationId,
      reasonNote: note || null,
    }).catch((emailErr) => {
      console.error('[Stage Email Dispatch Error] Non-blocking email dispatch failed:', emailErr);
    });
  } catch (err) {
    console.error('Stage transition transaction error:', err);
    res.status(500).json({ error: 'Failed to complete stage transition in database' });
  }
}

export async function addCandidateNote(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const { content } = req.body || {};

  if (!content || typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'Note content cannot be empty' });
    return;
  }

  const candidate = await prisma.candidate.findFirst({
    where: { OR: [{ id }, { applicationId: id }] },
  });

  if (!candidate) {
    res.status(404).json({ error: 'Candidate not found' });
    return;
  }

  const adminUserId = req.user?.id;
  if (!adminUserId) {
    res.status(401).json({ error: 'Authentication required to post note' });
    return;
  }

  try {
    const note = await prisma.note.create({
      data: {
        candidateId: candidate.id,
        authorId: adminUserId,
        authorName: req.user?.name || 'Operations Admin',
        content: content.trim(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({ note });
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Failed to record internal note' });
  }
}

export async function getCandidatesBoard(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const candidates = await prisma.candidate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        documents: {
          select: { id: true, category: true, status: true },
        },
        checklistItems: {
          select: { id: true, status: true, required: true },
        },
      },
    });

    const board: Record<Stage, Record<string, unknown>[]> = {
      APPLIED: [],
      SCREENING: [],
      INTERVIEW: [],
      VERIFIED: [],
      ONBOARDED: [],
      REJECTED: [],
    };

    const counts: Record<Stage, number> = {
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      VERIFIED: 0,
      ONBOARDED: 0,
      REJECTED: 0,
    };

    candidates.forEach((c) => {
      const daysInStage = Math.max(
        0,
        Math.floor((Date.now() - new Date(c.stageUpdatedAt).getTime()) / (1000 * 60 * 60 * 24))
      );

      const totalDocs = c.documents.length;
      const verifiedDocs = c.documents.filter((d) => d.status === 'VERIFIED').length;
      const totalChecklist = c.checklistItems.length;
      const verifiedChecklist = c.checklistItems.filter((chk) => chk.status === 'VERIFIED').length;

      const card = {
        id: c.id,
        applicationId: c.applicationId,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email,
        city: c.city,
        qualification: c.qualification,
        skills: c.skills,
        experienceYears: c.experienceYears,
        stage: c.stage,
        stageUpdatedAt: c.stageUpdatedAt,
        daysInStage,
        stats: {
          totalDocs,
          verifiedDocs,
          totalChecklist,
          verifiedChecklist,
        },
      };

      if (board[c.stage]) {
        board[c.stage].push(card);
        counts[c.stage]++;
      }
    });

    res.json({ board, counts, total: candidates.length });
  } catch (err) {
    console.error('Error fetching board candidates:', err);
    res.status(500).json({ error: 'Failed to retrieve candidate board' });
  }
}

/**
 * PATCH /api/candidates/:id/checklist/:itemId
 * Update status and remark of a checklist item.
 */
export async function updateChecklistItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id, itemId } = req.params;
    const { status, remark } = req.body;

    if (!id || !itemId) {
      res.status(400).json({ error: 'Candidate ID and checklist item ID are required' });
      return;
    }

    const validStatuses = Object.values(VerificationStatus);
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    if (
      (status === VerificationStatus.REJECTED || status === VerificationStatus.REUPLOAD_REQUESTED) &&
      (!remark || !remark.trim())
    ) {
      res.status(400).json({
        error: 'A remark is required when rejecting or requesting re-upload for a checklist item',
      });
      return;
    }

    const candidate = await prisma.candidate.findFirst({
      where: { OR: [{ id }, { applicationId: id }] },
      select: { id: true, fullName: true },
    });

    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    const existingItem = await prisma.checklistItem.findFirst({
      where: { id: itemId, candidateId: candidate.id },
    });

    if (!existingItem) {
      res.status(404).json({ error: 'Checklist item not found for this candidate' });
      return;
    }

    const adminName = req.user?.name || 'Operations Admin';
    const adminId = req.user?.id;

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.checklistItem.update({
        where: { id: existingItem.id },
        data: {
          status,
          remark: remark ? remark.trim() : null,
          updatedBy: adminName,
        },
      });

      if (
        (status === VerificationStatus.REJECTED || status === VerificationStatus.REUPLOAD_REQUESTED) &&
        adminId
      ) {
        await tx.note.create({
          data: {
            candidateId: candidate.id,
            authorId: adminId,
            authorName: adminName,
            content: `[Checklist: ${existingItem.label}] Status updated to ${status}. Remark: ${remark.trim()}`,
          },
        });
      }

      const allItems = await tx.checklistItem.findMany({
        where: { candidateId: candidate.id },
      });

      const totalItems = allItems.length;
      const verifiedItems = allItems.filter((i) => i.status === VerificationStatus.VERIFIED).length;
      const requiredItems = allItems.filter((i) => i.required);
      const allRequiredVerified = requiredItems.every((i) => i.status === VerificationStatus.VERIFIED);

      return {
        item: updatedItem,
        stats: {
          totalItems,
          verifiedItems,
          allRequiredVerified,
        },
      };
    });

    res.json({
      message: `Checklist item marked as ${status}`,
      checklistItem: result.item,
      stats: result.stats,
    });
  } catch (err) {
    console.error('Error updating checklist item:', err);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
}

/**
 * PATCH /api/candidates/:id/documents/:docId/status
 * Update document verification status and optional remark.
 */
export async function updateDocumentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id, docId } = req.params;
    const { status, remark } = req.body;

    if (!id || !docId) {
      res.status(400).json({ error: 'Candidate ID and document ID are required' });
      return;
    }

    const validStatuses = Object.values(VerificationStatus);
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    if (
      (status === VerificationStatus.REJECTED || status === VerificationStatus.REUPLOAD_REQUESTED) &&
      (!remark || !remark.trim())
    ) {
      res.status(400).json({
        error: 'A remark is required when rejecting or requesting re-upload for a document',
      });
      return;
    }

    const candidate = await prisma.candidate.findFirst({
      where: { OR: [{ id }, { applicationId: id }] },
      select: { id: true, fullName: true },
    });

    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    const existingDoc = await prisma.document.findFirst({
      where: { id: docId, candidateId: candidate.id },
    });

    if (!existingDoc) {
      res.status(404).json({ error: 'Document not found for this candidate' });
      return;
    }

    const adminName = req.user?.name || 'Operations Admin';
    const adminId = req.user?.id;

    const result = await prisma.$transaction(async (tx) => {
      const updatedDoc = await tx.document.update({
        where: { id: existingDoc.id },
        data: {
          status,
        },
      });

      if (remark && remark.trim() && adminId) {
        await tx.note.create({
          data: {
            candidateId: candidate.id,
            authorId: adminId,
            authorName: adminName,
            content: `[Document: ${existingDoc.category} - ${existingDoc.originalName}] Status set to ${status}. Remark: ${remark.trim()}`,
          },
        });
      }

      const allDocs = await tx.document.findMany({
        where: { candidateId: candidate.id },
      });

      const totalDocs = allDocs.length;
      const verifiedDocs = allDocs.filter((d) => d.status === VerificationStatus.VERIFIED).length;

      return {
        document: updatedDoc,
        stats: {
          totalDocs,
          verifiedDocs,
        },
      };
    });

    res.json({
      message: `Document marked as ${status}`,
      document: result.document,
      stats: result.stats,
    });
  } catch (err) {
    console.error('Error updating document status:', err);
    res.status(500).json({ error: 'Failed to update document status' });
  }
}

/**
 * GET /api/candidates/verification/queue
 * Returns candidates in SCREENING and INTERVIEW stages with checklist and document breakdown.
 */
export async function getVerificationQueue(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const candidates = await prisma.candidate.findMany({
      where: {
        stage: { in: [Stage.APPLIED, Stage.SCREENING, Stage.VERIFIED] },
      },
      orderBy: [
        { stage: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        checklistItems: {
          orderBy: { updatedAt: 'asc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    let totalPendingChecklistItems = 0;
    let totalReadyToAdvance = 0;
    let totalReuploadRequested = 0;

    const queue = candidates.map((c) => {
      const totalDocs = c.documents.length;
      const verifiedDocs = c.documents.filter((d) => d.status === VerificationStatus.VERIFIED).length;
      const totalChecklist = c.checklistItems.length;
      const verifiedChecklist = c.checklistItems.filter(
        (chk) => chk.status === VerificationStatus.VERIFIED
      ).length;
      const requiredItems = c.checklistItems.filter((chk) => chk.required);
      const verifiedRequired = requiredItems.filter(
        (chk) => chk.status === VerificationStatus.VERIFIED
      ).length;
      const allRequiredVerified = requiredItems.length > 0 && verifiedRequired === requiredItems.length;

      const hasReuploadRequested =
        c.checklistItems.some((chk) => chk.status === VerificationStatus.REUPLOAD_REQUESTED) ||
        c.documents.some((doc) => doc.status === VerificationStatus.REUPLOAD_REQUESTED);

      const pendingItemsCount = c.checklistItems.filter(
        (chk) => chk.status === VerificationStatus.PENDING || chk.status === VerificationStatus.REJECTED
      ).length;

      totalPendingChecklistItems += pendingItemsCount;
      if (hasReuploadRequested) totalReuploadRequested++;
      if (allRequiredVerified) totalReadyToAdvance++;

      const daysInStage = Math.max(
        0,
        Math.floor((Date.now() - new Date(c.stageUpdatedAt).getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        id: c.id,
        applicationId: c.applicationId,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email,
        city: c.city,
        qualification: c.qualification,
        experienceYears: c.experienceYears,
        skills: c.skills,
        stage: c.stage,
        stageUpdatedAt: c.stageUpdatedAt,
        daysInStage,
        stats: {
          totalDocs,
          verifiedDocs,
          totalChecklist,
          verifiedChecklist,
          requiredCount: requiredItems.length,
          verifiedRequiredCount: verifiedRequired,
          allRequiredVerified,
          hasReuploadRequested,
        },
        checklistItems: c.checklistItems,
        documents: c.documents.map((d) => ({
          id: d.id,
          category: d.category,
          originalName: d.originalName,
          status: d.status,
          mimeType: d.mimeType,
          sizeBytes: d.sizeBytes,
        })),
      };
    });

    res.json({
      queue,
      summary: {
        totalInQueue: candidates.length,
        totalPendingChecklistItems,
        totalReadyToAdvance,
        totalReuploadRequested,
      },
    });
  } catch (err) {
    console.error('Error fetching verification queue:', err);
    res.status(500).json({ error: 'Failed to retrieve verification queue' });
  }
}

/**
 * POST /api/candidates/:id/emails/:emailId/resend
 * Re-triggers delivery for a specific email log entry.
 */
export async function resendCandidateEmail(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id, emailId } = req.params;
    if (!id || !emailId) {
      res.status(400).json({ error: 'Candidate ID and email ID are required' });
      return;
    }

    const candidate = await prisma.candidate.findFirst({
      where: { OR: [{ id }, { applicationId: id }] },
    });

    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    const log = await prisma.emailLog.findFirst({
      where: { id: emailId, candidateId: candidate.id },
    });

    if (!log) {
      res.status(404).json({ error: 'Email record not found for this candidate' });
      return;
    }

    const result = await resendEmailLog(log.id);

    const updatedLogs = await prisma.emailLog.findMany({
      where: { candidateId: candidate.id },
      orderBy: { sentAt: 'desc' },
    });

    res.json({
      success: result.success,
      message: result.success ? 'Email resent successfully' : 'Failed to resend email',
      error: result.error,
      emailLogs: updatedLogs,
    });
  } catch (err: unknown) {
    console.error('Error resending email:', err);
    res.status(500).json({ error: (err as Error).message || 'Failed to resend email' });
  }
}



