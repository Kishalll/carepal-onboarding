import { Request, Response, NextFunction } from 'express';

export async function verifyTurnstile(req: Request, res: Response, next: NextFunction): Promise<void> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  const token = req.body?.turnstileToken;

  // Reject if token is missing
  if (!token) {
    res.status(400).json({
      error: 'turnstile_missing',
      message: 'Bot verification token is missing. Please complete the security check.',
    });
    return;
  }

  // Handle Cloudflare test dummy keys for local and CI environments
  if (secretKey === '1x00000000000000000000000000000000AA' || token === 'XXXX.DUMMY.TOKEN.XXXX') {
    if (token === 'invalid-token' || token === 'REJECT_ME') {
      res.status(400).json({
        error: 'turnstile_failed',
        message: 'Security challenge verification failed. Please try again.',
      });
      return;
    }
    // Test key passes
    next();
    return;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey || '');
    formData.append('response', token);
    if (req.ip) {
      formData.append('remoteip', req.ip);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const outcome = (await response.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!outcome.success) {
      res.status(400).json({
        error: 'turnstile_failed',
        message: 'Security challenge verification failed. Please try again.',
      });
      return;
    }

    next();
  } catch (err) {
    console.error('Turnstile verification error:', err);
    res.status(500).json({
      error: 'turnstile_error',
      message: 'Security verification service temporarily unavailable.',
    });
  }
}
