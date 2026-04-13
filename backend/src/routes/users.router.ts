import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

/**
 * PUT /api/users/me/password
 * 修改当前用户密码
 */
router.put('/me/password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user!.user_id;

    if (!oldPassword || !newPassword) {
      res.status(400).json({ code: 400, message: '旧密码和新密码不能为空' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ code: 400, message: '新密码长度不能少于 6 位' });
      return;
    }

    const [users] = await pool.query(
      'SELECT password FROM users WHERE user_id = ?',
      [userId]
    ) as any[];

    if (!users.length) {
      res.status(404).json({ code: 404, message: '用户不存在' });
      return;
    }

    const isValid = await bcrypt.compare(oldPassword, users[0].password);
    if (!isValid) {
      res.status(400).json({ code: 400, message: '旧密码不正确' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [hashed, userId]);

    res.json({ code: 200, message: '密码修改成功' });
  } catch (err) {
    console.error('[Users] Update password error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * PUT /api/users/me/name
 * 修改当前用户显示名称
 */
router.put('/me/name', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const userId = req.user!.user_id;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ code: 400, message: '名称不能为空' });
      return;
    }

    await pool.query(
      'UPDATE users SET anonymous_name = ? WHERE user_id = ?',
      [name.trim(), userId]
    );

    res.json({ code: 200, message: '名称修改成功' });
  } catch (err) {
    console.error('[Users] Update name error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
