import { Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '@carepal/shared';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    res.cookie('carepal_admin_session', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_MS,
      path: '/',
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Unable to process login request' });
  }
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  const sessionId = req.cookies?.carepal_admin_session;

  if (sessionId) {
    try {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    } catch {
      // Ignore if already deleted
    }
  }

  res.clearCookie('carepal_admin_session', { path: '/' });
  res.json({ ok: true });
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (req.user) {
    res.json({ user: req.user });
    return;
  }

  const sessionId = req.cookies?.carepal_admin_session;
  if (!sessionId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!session || new Date() > session.expiresAt) {
      if (session) {
        await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
      }
      res.clearCookie('carepal_admin_session', { path: '/' });
      res.status(401).json({ error: 'Session expired or not found' });
      return;
    }

    res.json({ user: session.user });
  } catch (err) {
    console.error('Auth /me error:', err);
    res.status(500).json({ error: 'Internal server error checking session' });
  }
}
