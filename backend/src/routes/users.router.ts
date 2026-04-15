import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

/** 管理员判断：从共享的 isAdmin 工具函数获取 */

/**
 * GET /api/users?page=1&pageSize=10
 * 获取所有用户列表（仅管理员），分页
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ code: 403, message: '需要管理员权限' });
    return;
  }
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10)));
    const offset = (page - 1) * pageSize;

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users') as any[];

    const [rows] = await pool.query(
      `SELECT u.user_id, u.account, u.anonymous_name, u.is_enabled,
              MIN(up.group_id)   AS group_id,
              MIN(pg.group_name) AS group_name
       FROM users u
       LEFT JOIN user_permissions up ON u.user_id = up.user_id
       LEFT JOIN permission_groups pg ON up.group_id = pg.group_id
       GROUP BY u.user_id, u.account, u.anonymous_name, u.is_enabled
       ORDER BY u.user_id ASC
       LIMIT ? OFFSET ?`,
      [pageSize, offset],
    ) as any[];

    // 查询每个用户的权限列表
    const [gpRows] = await pool.query(
      `SELECT up2.user_id, gp.permission_key
       FROM user_permissions up2
       JOIN group_permissions gp ON up2.group_id = gp.group_id`,
    ) as any[];
    const permMap: Record<number, Record<string, boolean>> = {};
    for (const r of gpRows as any[]) {
      if (!permMap[r.user_id]) permMap[r.user_id] = {};
      permMap[r.user_id][r.permission_key] = true;
    }

    res.json({
      total,
      page,
      pageSize,
      items: (rows as any[]).map((u: any) => {
        const perms = permMap[u.user_id] ?? {};
        return {
          id: u.user_id,
          account: u.account,
          name: u.anonymous_name,
          is_enabled: Boolean(u.is_enabled),
          group_id: u.group_id ?? null,
          group_name: u.group_name ?? null,
          permissions: {
            can_read: Boolean(perms.can_read),
            can_comment: Boolean(perms.can_comment),
            can_add_file: Boolean(perms.can_add_file),
            can_edit_file: Boolean(perms.can_edit_file),
            can_create_dir: Boolean(perms.can_create_dir),
            can_delete_file: Boolean(perms.can_delete_file),
            can_admin: Boolean(perms.can_admin),
          },
        };
      }),
    });
  } catch (err) {
    console.error('[Users] List error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * POST /api/users
 * 创建新用户（仅管理员）
 * Body: { account, name, password, group_id }
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ code: 403, message: '需要管理员权限' });
    return;
  }
  try {
    const { account, name, password, group_id } = req.body;

    if (!account || !name || !password) {
      res.status(400).json({ code: 400, message: '账号、名称和密码不能为空' });
      return;
    }
    if (typeof account !== 'string' || !/^[a-zA-Z0-9_]{3,30}$/.test(account)) {
      res.status(400).json({ code: 400, message: '账号只能包含字母、数字和下划线，长度 3-30 位' });
      return;
    }
    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ code: 400, message: '密码长度不能少于 6 位' });
      return;
    }

    // 检查账号是否已存在
    const [existing] = await pool.query('SELECT user_id FROM users WHERE account = ?', [account]) as any[];
    if ((existing as any[]).length) {
      res.status(409).json({ code: 409, message: '账号已存在' });
      return;
    }

    // 校验权限组是否存在
    if (!group_id) {
      res.status(400).json({ code: 400, message: '请选择权限组' });
      return;
    }
    const [groupRows] = await pool.query('SELECT group_id FROM permission_groups WHERE group_id = ?', [group_id]) as any[];
    if (!(groupRows as any[]).length) {
      res.status(400).json({ code: 400, message: '权限组不存在' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const [userResult] = await pool.query(
      'INSERT INTO users (account, password, anonymous_name) VALUES (?, ?, ?)',
      [account.trim(), hashed, name.trim()],
    ) as any[];

    const userId = (userResult as any).insertId;
    await pool.query('INSERT INTO user_permissions (user_id, group_id) VALUES (?, ?)', [userId, group_id]);

    res.status(201).json({ code: 201, message: '用户创建成功', userId });
  } catch (err) {
    console.error('[Users] Create error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * PUT /api/users/:id/group
 * 修改用户权限组（仅管理员）
 * Body: { group_id }
 */
router.put('/:id/group', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ code: 403, message: '需要管理员权限' });
    return;
  }
  try {
    const userId = parseInt(req.params.id, 10);
    const { group_id } = req.body;
    if (!group_id) {
      res.status(400).json({ code: 400, message: '请提供权限组 ID' });
      return;
    }
    const [groupRows] = await pool.query('SELECT group_id FROM permission_groups WHERE group_id = ?', [group_id]) as any[];
    if (!(groupRows as any[]).length) {
      res.status(404).json({ code: 404, message: '权限组不存在' });
      return;
    }
    // 替换用户的权限组（先删除旧记录，再插入新记录）
    await pool.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
    await pool.query('INSERT INTO user_permissions (user_id, group_id) VALUES (?, ?)', [userId, group_id]);
    res.json({ code: 200, message: '权限组已更新' });
  } catch (err) {
    console.error('[Users] Update group error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * PUT /api/users/:id/status
 * 启用/禁用用户（仅管理员，不能禁用自身）
 * Body: { is_enabled: boolean }
 */
router.put('/:id/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ code: 403, message: '需要管理员权限' });
    return;
  }
  try {
    const userId = parseInt(req.params.id, 10);
    if (userId === req.user!.user_id) {
      res.status(400).json({ code: 400, message: '不能禁用自己的账号' });
      return;
    }
    const { is_enabled } = req.body;
    const [result] = await pool.query(
      'UPDATE users SET is_enabled = ? WHERE user_id = ?',
      [Boolean(is_enabled), userId],
    ) as any[];
    if ((result as any).affectedRows === 0) {
      res.status(404).json({ code: 404, message: '用户不存在' });
      return;
    }
    res.json({ code: 200, message: is_enabled ? '用户已启用' : '用户已禁用' });
  } catch (err) {
    console.error('[Users] Update status error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

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

/**
 * DELETE /api/users/:id
 * 删除用户（仅管理员，只能删除已禁用的用户，不能删除自身）
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ code: 403, message: '需要管理员权限' });
    return;
  }
  try {
    const userId = parseInt(req.params.id, 10);
    if (userId === req.user!.user_id) {
      res.status(400).json({ code: 400, message: '不能删除自己的账号' });
      return;
    }
    const [rows] = await pool.query('SELECT is_enabled FROM users WHERE user_id = ?', [userId]) as any[];
    if (!(rows as any[]).length) {
      res.status(404).json({ code: 404, message: '用户不存在' });
      return;
    }
    if (Boolean((rows as any[])[0].is_enabled)) {
      res.status(400).json({ code: 400, message: '只能删除已禁用的用户' });
      return;
    }
    await pool.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);
    res.json({ code: 200, message: '用户已删除' });
  } catch (err) {
    console.error('[Users] Delete error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
