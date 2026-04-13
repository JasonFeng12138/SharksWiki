import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

import authRouter from './routes/auth.router.js';
import usersRouter from './routes/users.router.js';
import documentsRouter from './routes/documents.router.js';
import commentsRouter from './routes/comments.router.js';
import configRouter from './routes/config.router.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'development';

// ── 中间件 ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// ── API 路由 ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/config', configRouter);

// ── 上传文件静态服务 ─────────────────────────────────────────────────────────
const CONFIG_DIR = path.resolve(process.env.CONFIG_DIR ?? './config');
app.use('/api/uploads', express.static(path.join(CONFIG_DIR, 'uploads')));

// ── 健康检查 ─────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 生产模式：托管前端静态文件 ─────────────────────────────────────────────────
if (NODE_ENV === 'production') {
  const FRONTEND_DIST = path.resolve(process.env.FRONTEND_DIST ?? '../frontend/dist');
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// ── 启动前确保必要目录存在 ──────────────────────────────────────────────────────
async function ensureDirs(): Promise<void> {
  const DOCS_DIR = path.resolve(process.env.DOCS_DIR ?? './docs');
  await fs.mkdir(DOCS_DIR, { recursive: true });
  await fs.mkdir(path.resolve(process.env.CONFIG_DIR ?? './config', 'uploads'), { recursive: true });
}

ensureDirs()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SharksWiki] Backend server running on http://0.0.0.0:${PORT} (${NODE_ENV})`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize directories:', err);
    process.exit(1);
  });
