import { Request, Response, NextFunction } from 'express';
import { prisma } from '@carepal/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  sessionId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.carepal_admin_session;

  if (!sessionId) {
    res.status(401).json({ error: 'Authentication required' });
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

    if (!session) {
      res.clearCookie('carepal_admin_session', { path: '/' });
      res.status(401).json({ error: 'Session not found or invalid' });
      return;
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
      res.clearCookie('carepal_admin_session', { path: '/' });
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    req.user = session.user;
    req.sessionId = session.id;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}
