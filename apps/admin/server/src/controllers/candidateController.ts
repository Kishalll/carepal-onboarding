import { Request, Response } from 'express';
import path from 'node:path';
import {
  prisma,
  storageAdapter,
  Prisma,
  Stage,
  Qualification,
  AvailabilityType,
} from '@carepal/shared';

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
