import { Router, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

const DOCS_DIR = path.resolve(process.env.DOCS_DIR || './docs');

/** 防止路径穿越攻击 */
function getSafePath(userPath: string): string {
  const resolved = path.resolve(DOCS_DIR, userPath);
  if (!resolved.startsWith(DOCS_DIR + path.sep) && resolved !== DOCS_DIR) {
    throw new Error('非法路径');
  }
  return resolved;
}

/** 递归将 DB 节点列表构建为树状结构 */
function buildTreeFromNodes(nodes: any[], parentId: number | null = null): any[] {
  return nodes
    .filter((n: any) => n.parent_id === parentId)
    .map((n: any) => {
      const node: any = {
        id: String(n.node_id),
        name: n.title,
        path: n.file_path,
        type: n.node_type,
        author: n.creator_name,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      };
      if (n.node_type === 'directory') {
        node.children = buildTreeFromNodes(nodes, n.node_id);
      }
      return node;
    })
    .sort((a: any, b: any) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      if (a.type === 'file') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return a.name.localeCompare(b.name);
    });
}

/**
 * GET /api/documents/tree
 * 获取文档目录树
 */
router.get('/tree', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [nodes] = await pool.query(
      `SELECT fn.node_id, fn.parent_id, fn.node_type, fn.title, fn.file_path,
              fn.creator_id, fn.modifier_id, fn.created_at, fn.updated_at,
              u.anonymous_name AS creator_name
       FROM file_nodes fn
       LEFT JOIN users u ON fn.creator_id = u.user_id
       ORDER BY fn.node_type ASC, fn.title ASC`
    ) as any[];

    res.json(buildTreeFromNodes(nodes as any[], null));
  } catch (err) {
    console.error('[Documents] Get tree error:', err);
    res.status(500).json({ code: 500, message: '获取目录树失败' });
  }
});

/**
 * GET /api/documents/detail?path=...
 * 获取文档详情（内容）
 */
router.get('/detail', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reqPath = req.query.path as string;
    if (!reqPath) {
      res.status(400).json({ code: 400, message: 'path 参数不能为空' });
      return;
    }

    const [nodes] = await pool.query(
      `SELECT fn.node_id, fn.file_path, fn.created_at, fn.updated_at,
              u.anonymous_name AS creator_name
       FROM file_nodes fn
       LEFT JOIN users u ON fn.creator_id = u.user_id
       WHERE fn.file_path = ? AND fn.node_type = 'file'`,
      [reqPath]
    ) as any[];

    if (!(nodes as any[]).length) {
      res.status(404).json({ code: 404, message: '文档不存在' });
      return;
    }

    const node = (nodes as any[])[0];
    const fullPath = getSafePath(node.file_path);
    const content = await fs.readFile(fullPath, 'utf-8');

    res.json({
      id: String(node.node_id),
      content,
      author: node.creator_name,
      createdAt: node.created_at,
      updatedAt: node.updated_at,
    });
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ code: 404, message: '文档文件不存在' });
    } else {
      console.error('[Documents] Get detail error:', err);
      res.status(500).json({ code: 500, message: '获取文档详情失败' });
    }
  }
});

/**
 * POST /api/documents
 * 创建文档或目录
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { parentPath, name, type, content } = req.body;
    const user = req.user!;

    if (!name || !type) {
      res.status(400).json({ code: 400, message: 'name 和 type 不能为空' });
      return;
    }

    if (type !== 'file' && type !== 'directory') {
      res.status(400).json({ code: 400, message: 'type 只能为 file 或 directory' });
      return;
    }

    if (type === 'directory' && !user.permissions.can_create_dir) {
      res.status(403).json({ code: 403, message: '无创建目录权限' });
      return;
    }
    if (type === 'file' && !user.permissions.can_add_file) {
      res.status(403).json({ code: 403, message: '无新增文件权限' });
      return;
    }

    const nodePath = parentPath ? `${parentPath}/${name}` : name;
    const fullPath = getSafePath(nodePath);

    // 查询父节点 ID
    let parentNodeId: number | null = null;
    if (parentPath) {
      const [parentNodes] = await pool.query(
        'SELECT node_id FROM file_nodes WHERE file_path = ?',
        [parentPath]
      ) as any[];
      if ((parentNodes as any[]).length) {
        parentNodeId = (parentNodes as any[])[0].node_id;
      }
    }

    // 检查同名节点是否已存在
    const [existing] = await pool.query(
      'SELECT node_id FROM file_nodes WHERE file_path = ?',
      [nodePath]
    ) as any[];
    if ((existing as any[]).length) {
      res.status(409).json({ code: 409, message: '同名文件或目录已存在' });
      return;
    }

    // 创建磁盘文件/目录
    if (type === 'directory') {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content || '', 'utf-8');
    }

    // 写入数据库
    await pool.query(
      'INSERT INTO file_nodes (parent_id, node_type, title, file_path, creator_id, modifier_id) VALUES (?, ?, ?, ?, ?, ?)',
      [parentNodeId, type, name, nodePath, user.user_id, user.user_id]
    );

    res.json({ code: 200, message: 'success' });
  } catch (err) {
    console.error('[Documents] Create error:', err);
    res.status(500).json({ code: 500, message: '创建失败' });
  }
});

/**
 * PUT /api/documents
 * 更新文档内容
 */
router.put('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { path: reqPath, content } = req.body;
    const user = req.user!;

    if (!user.permissions.can_edit_file) {
      res.status(403).json({ code: 403, message: '无编辑文件权限' });
      return;
    }

    if (!reqPath) {
      res.status(400).json({ code: 400, message: 'path 不能为空' });
      return;
    }

    const [nodes] = await pool.query(
      "SELECT node_id FROM file_nodes WHERE file_path = ? AND node_type = 'file'",
      [reqPath]
    ) as any[];

    if (!(nodes as any[]).length) {
      res.status(404).json({ code: 404, message: '文档不存在' });
      return;
    }

    const fullPath = getSafePath(reqPath);
    await fs.writeFile(fullPath, content ?? '', 'utf-8');

    await pool.query(
      'UPDATE file_nodes SET modifier_id = ? WHERE file_path = ?',
      [user.user_id, reqPath]
    );

    res.json({ code: 200, message: 'success' });
  } catch (err) {
    console.error('[Documents] Update error:', err);
    res.status(500).json({ code: 500, message: '保存失败' });
  }
});

/**
 * DELETE /api/documents?path=...
 * 删除文档或目录（目录会级联删除子节点）
 */
router.delete('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reqPath = req.query.path as string;
    const user = req.user!;

    if (!user.permissions.can_delete_file) {
      res.status(403).json({ code: 403, message: '无删除文件权限' });
      return;
    }

    if (!reqPath) {
      res.status(400).json({ code: 400, message: 'path 不能为空' });
      return;
    }

    const [nodes] = await pool.query(
      'SELECT node_id, node_type FROM file_nodes WHERE file_path = ?',
      [reqPath]
    ) as any[];

    if (!(nodes as any[]).length) {
      res.status(404).json({ code: 404, message: '文档或目录不存在' });
      return;
    }

    const targetPath = getSafePath(reqPath);

    // 删除磁盘文件
    try {
      const stats = await fs.stat(targetPath);
      if (stats.isDirectory()) {
        await fs.rm(targetPath, { recursive: true, force: true });
      } else {
        await fs.unlink(targetPath);
      }
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
    }

    // 删除数据库记录（CASCADE 会级联删除子节点）
    await pool.query('DELETE FROM file_nodes WHERE file_path = ?', [reqPath]);

    res.json({ code: 200, message: 'success' });
  } catch (err) {
    console.error('[Documents] Delete error:', err);
    res.status(500).json({ code: 500, message: '删除失败' });
  }
});

export default router;
