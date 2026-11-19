import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getCandidates,
  exportCandidatesCsv,
  getCandidatesBoard,
  getCandidateById,
  getDocumentViewLink,
  changeCandidateStage,
  addCandidateNote,
} from '../controllers/candidateController.js';

const router = Router();

router.get('/', requireAuth, getCandidates);
router.get('/board', requireAuth, getCandidatesBoard);
router.get('/export', requireAuth, exportCandidatesCsv);
router.get('/:id', requireAuth, getCandidateById);
router.get('/:id/documents/:docId/view-link', requireAuth, getDocumentViewLink);
router.post('/:id/stage', requireAuth, changeCandidateStage);
router.post('/:id/notes', requireAuth, addCandidateNote);

export default router;
