import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getCandidates,
  exportCandidatesCsv,
  getCandidateById,
  getDocumentViewLink,
} from '../controllers/candidateController.js';

const router = Router();

router.get('/', requireAuth, getCandidates);
router.get('/export', requireAuth, exportCandidatesCsv);
router.get('/:id', requireAuth, getCandidateById);
router.get('/:id/documents/:docId/view-link', requireAuth, getDocumentViewLink);

export default router;
