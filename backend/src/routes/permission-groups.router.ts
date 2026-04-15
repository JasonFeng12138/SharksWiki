import { Router, Response } from 'express';
import pool from '../config/database.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

// ── 工具：查询某权限组拥有的权限 key 列表 ────────────────────────────────────
async function getGroupPermissionKeys(groupId: number): Promise<string[]> {
  const [rows] = await pool.query(
    'SELECT permission_key FROM group_permissions WHERE group_id = ? ORDER BY permission_key',
    [groupId],
  ) as any[];
  return (rows as any[]).map((r: any) => r.permission_key as string);
}

/**
 * GET /api/permission-groups/catalog
 * 获取权限目录（所有可用权限），登录用户即可访问
 */
router.get('/catalog', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query(
      'SELECT permission_key, display_name, description, sort_order FROM permissions ORDER BY sort_order ASC',
    ) as any[];
    res.json(rows);
  } catch (err) {
    console.error('[PermGroups] Catalog error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * GET /api/permission-groups
 * 获取所有权限组（仅管理员），包含每组的权限 key 列表
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ code: 403, message: '需要管理员权限' });
    return;
  }
  try {
    const [groups] = await pool.query(
      'SELECT group_id, group_name, created_at FROM permission_groups ORDER BY group_id ASC',
    ) as any[];

    const [gpRows] = await pool.query(
      'SELECT group_id, permission_key FROM group_permissions',
    ) as any[];

    const permMap: Record<number, string[]> = {};
    for (const row of gpRows as any[]) {
      const gid = row.group_id as number;
      if (!permMap[gid]) permMap[gid] = [];
      permMap[gid].push(row.permission_key as string);
    }

    res.json((groups as any[]).map((g: any) => ({
      group_id: g.group_id,
      group_name: g.group_name,
      permission_keys: permMap[g.group_id] ?? [],
    })));
  } catch (err) {
    console.error('[PermGroups] List error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * POST /api/permission-groups
 * 创建新权限组（仅管理员）
 * Body: { group_name: string, permission_keys: string[] }
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ code: 403, message: '需要管理员权限' });
    return;
  }
  try {
    const { group_name, permission_keys } = req.body as { group_name: string; permission_keys: string[] };
    if (!group_name || typeof group_name !== 'string' || !group_name.trim()) {
      res.status(400).json({ code: 400, message: '权限组名称不能为空' });
      return;
    }
    const keys: string[] = Array.isArray(permission_keys) ? permission_keys : [];

    const [result] = await pool.query(
      'INSERT INTO permission_groups (group_name) VALUES (?)',
      [group_name.trim()],
    ) as any[];
    const groupId = (result as any).insertId as number;

    if (keys.length > 0) {
      const values = keys.map((k) => [groupId, k]);
      await pool.query('INSERT IGNORE INTO group_permissions (group_id, permission_key) VALUES ?', [values]);
    }

    res.status(201).json({ code: 201, message: '权限组创建成功', group_id: groupId });
  } catch (err) {
    console.error('[PermGroups] Create error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * PUT /api/permission-groups/:id
 * 更新权限组名称和权限（仅管理员）
 * Body: { group_name?: string, permission_keys: string[] }
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ code: 403, message: '需要管理员权限' });
    return;
  }
  try {
    const groupId = parseInt(req.params.id, 10);
    const { group_name, permission_keys } = req.body as { group_name?: string; permission_keys: string[] };

    if (group_name !== undefined) {
      if (typeof group_name !== 'string' || !group_name.trim()) {
        res.status(400).json({ code: 400, message: '权限组名称不能为空' });
        return;
      }
      const [result] = await pool.query(
        'UPDATE permission_groups SET group_name = ? WHERE group_id = ?',
        [group_name.trim(), groupId],
      ) as any[];
      if ((result as any).affectedRows === 0) {
        res.status(404).json({ code: 404, message: '权限组不存在' });
        return;
      }
    }

    if (Array.isArray(permission_keys)) {
      await pool.query('DELETE FROM group_permissions WHERE group_id = ?', [groupId]);
      if (permission_keys.length > 0) {
        const values = permission_keys.map((k) => [groupId, k]);
        await pool.query('INSERT IGNORE INTO group_permissions (group_id, permission_key) VALUES ?', [values]);
      }
    }

    const updatedKeys = await getGroupPermissionKeys(groupId);
    res.json({ code: 200, message: '权限组更新成功', permission_keys: updatedKeys });
  } catch (err) {
    console.error('[PermGroups] Update error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * DELETE /api/permission-groups/:id
 * 删除权限组（仅管理员，且该组无用户时才可删除）
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ code: 403, message: '需要管理员权限' });
    return;
  }
  try {
    const groupId = parseInt(req.params.id, 10);
    const [[{ cnt }]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM user_permissions WHERE group_id = ?',
      [groupId],
    ) as any[];
    if (cnt > 0) {
      res.status(409).json({ code: 409, message: '该权限组正在使用中，请先将成员迁移到其他权限组后再删除' });
      return;
    }
    const [result] = await pool.query('DELETE FROM permission_groups WHERE group_id = ?', [groupId]) as any[];
    if ((result as any).affectedRows === 0) {
      res.status(404).json({ code: 404, message: '权限组不存在' });
      return;
    }
    res.json({ code: 200, message: '权限组已删除' });
  } catch (err) {
    console.error('[PermGroups] Delete error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
