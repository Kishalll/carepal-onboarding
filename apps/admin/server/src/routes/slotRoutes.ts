import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getSlots,
  createSlot,
  deleteSlot,
  assignSlot,
  unassignSlot,
} from '../controllers/slotController.js';

const router = Router();

router.get('/', requireAuth, getSlots);
router.post('/', requireAuth, createSlot);
router.delete('/:id', requireAuth, deleteSlot);
router.post('/:id/assign', requireAuth, assignSlot);
router.post('/:id/unassign', requireAuth, unassignSlot);

export default router;
