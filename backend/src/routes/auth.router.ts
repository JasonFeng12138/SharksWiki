import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sharkswiki_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/** 判断是否为旧版 MD5 格式密码（用于兼容初始化数据） */
function isMd5Hash(hash: string): boolean {
  return /^[a-f0-9]{32}$/i.test(hash);
}

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * POST /api/auth/login
 * 用户登录，支持旧版 MD5 密码（首次登录后自动升级为 bcrypt）
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
      return;
    }

    const [users] = await pool.query(
      'SELECT user_id, account, password, anonymous_name FROM users WHERE account = ?',
      [username]
    ) as any[];

    if (!users.length) {
      res.status(401).json({ code: 401, message: '用户名或密码错误' });
      return;
    }

    const user = users[0];
    let isValid = false;

    if (isMd5Hash(user.password)) {
      // 兼容旧版 MD5 密码，验证通过后自动升级为 bcrypt
      isValid = md5(password) === user.password.toLowerCase();
      if (isValid) {
        const newHash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [newHash, user.user_id]);
      }
    } else {
      isValid = await bcrypt.compare(password, user.password);
    }

    if (!isValid) {
      res.status(401).json({ code: 401, message: '用户名或密码错误' });
      return;
    }

    // 查询权限（多个权限组取 OR）
    const [permRows] = await pool.query(
      `SELECT pg.can_create_dir, pg.can_add_file, pg.can_delete_file, pg.can_edit_file, pg.can_comment
       FROM user_permissions up
       JOIN permission_groups pg ON up.group_id = pg.group_id
       WHERE up.user_id = ?`,
      [user.user_id]
    ) as any[];

    const permissions = (permRows as any[]).reduce(
      (acc: any, row: any) => ({
        can_create_dir: acc.can_create_dir || Boolean(row.can_create_dir),
        can_add_file: acc.can_add_file || Boolean(row.can_add_file),
        can_delete_file: acc.can_delete_file || Boolean(row.can_delete_file),
        can_edit_file: acc.can_edit_file || Boolean(row.can_edit_file),
        can_comment: acc.can_comment || Boolean(row.can_comment),
      }),
      { can_create_dir: false, can_add_file: false, can_delete_file: false, can_edit_file: false, can_comment: false }
    );

    const tokenPayload = {
      user_id: user.user_id,
      account: user.account,
      anonymous_name: user.anonymous_name,
      permissions,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

    res.json({
      token,
      user: {
        id: user.user_id,
        account: user.account,
        name: user.anonymous_name,
        permissions,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * POST /api/auth/logout
 * JWT 为无状态，此接口仅作规范用途；生产环境可接入 Redis 黑名单
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ code: 200, message: 'success' });
});

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.user_id,
    account: user.account,
    name: user.anonymous_name,
    permissions: user.permissions,
  });
});

export default router;
