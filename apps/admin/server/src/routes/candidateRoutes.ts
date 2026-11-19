import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getCandidates,
  exportCandidatesCsv,
  getCandidatesBoard,
  getVerificationQueue,
  getCandidateById,
  getDocumentViewLink,
  changeCandidateStage,
  addCandidateNote,
  updateChecklistItem,
  updateDocumentStatus,
} from '../controllers/candidateController.js';

const router = Router();

router.get('/', requireAuth, getCandidates);
router.get('/board', requireAuth, getCandidatesBoard);
router.get('/verification/queue', requireAuth, getVerificationQueue);
router.get('/export', requireAuth, exportCandidatesCsv);
router.get('/:id', requireAuth, getCandidateById);
router.get('/:id/documents/:docId/view-link', requireAuth, getDocumentViewLink);
router.post('/:id/stage', requireAuth, changeCandidateStage);
router.post('/:id/notes', requireAuth, addCandidateNote);
router.patch('/:id/checklist/:itemId', requireAuth, updateChecklistItem);
router.patch('/:id/documents/:docId/status', requireAuth, updateDocumentStatus);

export default router;
