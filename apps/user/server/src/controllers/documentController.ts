import { Request, Response } from 'express';
import path from 'node:path';
import {
  prisma,
  storageAdapter,
  validateDocumentFile,
  detectMagicBytes,
} from '@carepal/shared';

// Document categories recognized by schema
const VALID_CATEGORIES = ['ID_PROOF', 'CERTIFICATE', 'PHOTO'] as const;

/**
 * Lists all uploaded documents for a candidate with signed preview URLs.
 */
export async function getCandidateDocuments(req: Request, res: Response): Promise<void> {
  const { applicationId } = req.params;

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { applicationId },
      select: {
        id: true,
        applicationId: true,
        fullName: true,
        qualification: true,
        stage: true,
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            category: true,
            idType: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            status: true,
            storageKey: true,
            createdAt: true,
          },
        },
      },
    });

    if (!candidate) {
      res.status(404).json({
        error: 'not_found',
        message: `No application found with ID ${applicationId}.`,
      });
      return;
    }

    // Attach signed preview URLs to each document
    const documentsWithUrls = candidate.documents.map((doc) => ({
      id: doc.id,
      category: doc.category,
      idType: doc.idType,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
      createdAt: doc.createdAt,
      previewUrl: storageAdapter.generateSignedUrl(doc.storageKey, 15),
    }));

    res.json({
      candidate: {
        id: candidate.id,
        applicationId: candidate.applicationId,
        fullName: candidate.fullName,
        qualification: candidate.qualification,
        stage: candidate.stage,
      },
      documents: documentsWithUrls,
    });
  } catch (error) {
    console.error('Failed to fetch candidate documents:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve documents. Please try again.',
    });
  }
}

/**
 * Handles multipart file upload for ID proof, certificates, or passport photo.
 */
export async function uploadCandidateDocument(req: Request, res: Response): Promise<void> {
  const { applicationId } = req.params;
  const file = req.file;
  const { category, idType } = req.body;

  // 1. Ensure file is present
  if (!file) {
    res.status(400).json({
      error: 'file_missing',
      message: 'Please choose a file to upload.',
    });
    return;
  }

  // 2. Validate category
  if (!category || !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({
      error: 'invalid_category',
      message: 'Invalid document category. Allowed: ID_PROOF, CERTIFICATE, PHOTO.',
    });
    return;
  }

  // 3. Inspect magic bytes, file size (<5MB), and MIME integrity
  const validation = validateDocumentFile({
    originalname: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    buffer: file.buffer,
  });

  if (!validation.valid || !validation.detectedMime) {
    res.status(400).json({
      error: 'invalid_file',
      message: validation.error || 'Invalid file format.',
    });
    return;
  }

  try {
    // 4. Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { applicationId },
      include: {
        documents: true,
      },
    });

    if (!candidate) {
      res.status(404).json({
        error: 'not_found',
        message: `No application found with ID ${applicationId}.`,
      });
      return;
    }

    // 5. Enforce category constraints
    if (category === 'CERTIFICATE') {
      const certificateCount = candidate.documents.filter(
        (d) => d.category === 'CERTIFICATE'
      ).length;
      if (certificateCount >= 5) {
        res.status(400).json({
          error: 'limit_exceeded',
          message: 'You have already uploaded the maximum of 5 qualification certificates.',
        });
        return;
      }
    }

    // For single-file categories (ID_PROOF, PHOTO), remove old one if present
    if (category === 'ID_PROOF' || category === 'PHOTO') {
      const existing = candidate.documents.find((d) => d.category === category);
      if (existing) {
        await storageAdapter.delete(existing.storageKey);
        await prisma.document.delete({ where: { id: existing.id } });
      }
    }

    // 6. Generate secure storage key and persist file
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const storageKey = `${candidate.id}/${category.toLowerCase()}_${Date.now()}_${sanitizedBase}${ext}`;

    await storageAdapter.save(storageKey, file.buffer);

    // 7. Create Document record in database
    const createdDoc = await prisma.document.create({
      data: {
        candidateId: candidate.id,
        category,
        idType: category === 'ID_PROOF' ? idType || 'GOVERNMENT_ID' : null,
        storageKey,
        originalName: file.originalname,
        mimeType: validation.detectedMime,
        sizeBytes: file.size,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      message: 'Document uploaded successfully.',
      document: {
        id: createdDoc.id,
        category: createdDoc.category,
        idType: createdDoc.idType,
        originalName: createdDoc.originalName,
        mimeType: createdDoc.mimeType,
        sizeBytes: createdDoc.sizeBytes,
        status: createdDoc.status,
        createdAt: createdDoc.createdAt,
        previewUrl: storageAdapter.generateSignedUrl(createdDoc.storageKey, 15),
      },
    });
  } catch (error) {
    console.error('Failed to upload document:', error);
    res.status(500).json({
      error: 'upload_failed',
      message: 'An error occurred while uploading the file. Please try again.',
    });
  }
}

/**
 * Removes an uploaded document from storage and database.
 */
export async function deleteCandidateDocument(req: Request, res: Response): Promise<void> {
  const { applicationId, documentId } = req.params;

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { applicationId },
      select: { id: true },
    });

    if (!candidate) {
      res.status(404).json({
        error: 'not_found',
        message: `Application ${applicationId} not found.`,
      });
      return;
    }

    const doc = await prisma.document.findFirst({
      where: {
        id: documentId,
        candidateId: candidate.id,
      },
    });

    if (!doc) {
      res.status(404).json({
        error: 'document_not_found',
        message: 'The requested document does not exist.',
      });
      return;
    }

    await storageAdapter.delete(doc.storageKey);
    await prisma.document.delete({ where: { id: documentId } });

    res.json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (error) {
    console.error('Failed to delete document:', error);
    res.status(500).json({
      error: 'delete_failed',
      message: 'Failed to delete the document. Please try again.',
    });
  }
}

/**
 * Serves private documents securely using HMAC-signed URLs.
 */
export async function viewPrivateDocument(req: Request, res: Response): Promise<void> {
  const storageKey = decodeURIComponent(req.params[0] || req.params.storageKey || '');
  const expires = parseInt(req.query.expires as string, 10);
  const sig = req.query.sig as string;

  if (!storageKey || !expires || !sig) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Missing signed URL verification parameters.',
    });
    return;
  }

  // Verify HMAC signature and expiry
  const isValid = storageAdapter.verifySignedUrl(storageKey, expires, sig);
  if (!isValid) {
    res.status(403).json({
      error: 'access_denied',
      message: 'This document preview link is invalid or has expired. Please refresh the page to get a new link.',
    });
    return;
  }

  try {
    const buffer = await storageAdapter.read(storageKey);
    if (!buffer) {
      res.status(404).json({
        error: 'file_not_found',
        message: 'The requested file was not found in storage.',
      });
      return;
    }

    const detectedMime = detectMagicBytes(buffer) || 'application/octet-stream';

    res.setHeader('Content-Type', detectedMime);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=900');
    res.send(buffer);
  } catch (error) {
    console.error('Failed to serve private document:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Could not stream document file.',
    });
  }
}
