import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { verifyTurnstile } from './middleware/turnstile.js';
import { submitApplication } from './controllers/applicationController.js';
import {
  getCandidateDocuments,
  uploadCandidateDocument,
  deleteCandidateDocument,
  viewPrivateDocument,
} from './controllers/documentController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.use(express.json());

  // Rate limiter for application submissions
  const applicationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'rate_limit_exceeded',
      message: 'Too many applications submitted from this network. Please wait a few minutes.',
    },
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'user',
      timestamp: new Date().toISOString(),
    });
  });

  // Multer upload handler (in-memory buffer, max 5MB)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
    },
  });

  const applicationUpload = upload.fields([
    { name: 'idProof', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'certificates', maxCount: 5 },
  ]);

  // Application submission endpoint
  app.post(
    '/api/applications',
    applicationLimiter,
    applicationUpload,
    verifyTurnstile,
    submitApplication
  );

  // Candidate document endpoints
  app.get('/api/applications/:applicationId/documents', getCandidateDocuments);
  app.post(
    '/api/applications/:applicationId/documents',
    upload.single('file'),
    uploadCandidateDocument
  );
  app.delete(
    '/api/applications/:applicationId/documents/:documentId',
    deleteCandidateDocument
  );

  // Private document viewing (HMAC-signed short-lived URLs)
  app.get('/api/documents/view/*', viewPrivateDocument);

  // Multer error handler for clean JSON responses
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          error: 'file_too_large',
          message: 'File size exceeds the 5 MB limit. Please compress or choose a smaller file.',
        });
        return;
      }
      next(err);
    }
  );

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { port: 24678 },
        host: '0.0.0.0',
      },
      appType: 'spa',
      root: path.resolve(__dirname, '../../client'),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`User app running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start user app:', err);
  process.exit(1);
});
