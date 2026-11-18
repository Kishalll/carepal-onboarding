import { Router } from 'express';
import { login, logout, me, loginRateLimiter } from '../controllers/authController.js';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);
router.get('/me', me);

export default router;
