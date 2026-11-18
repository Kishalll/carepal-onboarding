import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3001', 10);
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Auth routes
  app.use('/api/auth', authRoutes);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'admin',
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { port: 24679 },
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
    console.log(`Admin app running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start admin app:', err);
  process.exit(1);
});
