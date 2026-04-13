import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const CONFIG_DIR = path.resolve(process.env.CONFIG_DIR || './config');
const UPLOADS_DIR = path.join(CONFIG_DIR, 'uploads');
const CONFIG_FILE = path.join(CONFIG_DIR, 'wiki_config.json');

async function ensureConfigDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await fs.access(CONFIG_FILE);
  } catch {
    await fs.writeFile(CONFIG_FILE, JSON.stringify({ name: 'SharksWiki', icon: '' }));
  }
}
ensureConfigDir();

/**
 * GET /api/config
 * 获取 Wiki 配置（公开接口）
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(500).json({ code: 500, message: '读取配置失败' });
  }
});

/**
 * PUT /api/config
 * 更新 Wiki 配置（需登录）
 */
router.put('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, icon } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ code: 400, message: 'name 不能为空' });
      return;
    }
    await fs.writeFile(CONFIG_FILE, JSON.stringify({ name: name.trim(), icon: icon ?? '' }));
    res.json({ code: 200, message: 'success' });
  } catch {
    res.status(500).json({ code: 500, message: '保存配置失败' });
  }
});

/**
 * POST /api/config/icon
 * 上传 Wiki 图标（Content-Type 为图片类型，请求体为二进制流）
 */
router.post(
  '/icon',
  authMiddleware,
  express.raw({ type: 'image/*', limit: '2mb' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const contentType = req.headers['content-type'] ?? 'image/png';
      const extension = contentType.split('/')[1]?.split(';')[0] ?? 'png';

      // 清理旧图标
      const existingFiles = await fs.readdir(UPLOADS_DIR);
      await Promise.all(existingFiles.map((f) => fs.unlink(path.join(UPLOADS_DIR, f))));

      const filename = `wiki_icon_${crypto.randomBytes(8).toString('hex')}.${extension}`;
      await fs.writeFile(path.join(UPLOADS_DIR, filename), req.body as Buffer);

      res.json({ url: `/api/uploads/${filename}` });
    } catch (err) {
      console.error('[Config] Upload icon error:', err);
      res.status(500).json({ code: 500, message: '上传图标失败' });
    }
  }
);

export default router;
