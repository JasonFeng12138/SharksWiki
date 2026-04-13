import { Router, Request, Response } from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

/**
 * GET /api/comments?documentId=...
 * 获取指定文件的评论列表
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const documentId = req.query.documentId as string;
    if (!documentId || isNaN(Number(documentId))) {
      res.status(400).json({ code: 400, message: 'documentId 参数无效' });
      return;
    }

    const [comments] = await pool.query(
      `SELECT c.comment_id AS id,
              c.file_id AS documentId,
              c.content,
              c.commenter_id AS authorId,
              u.anonymous_name AS authorName,
              c.created_at AS createdAt,
              c.reply_to_comment_id AS replyToId
       FROM comments c
       LEFT JOIN users u ON c.commenter_id = u.user_id
       WHERE c.file_id = ?
       ORDER BY c.created_at ASC`,
      [documentId]
    ) as any[];

    res.json(comments);
  } catch (err) {
    console.error('[Comments] Get list error:', err);
    res.status(500).json({ code: 500, message: '获取评论失败' });
  }
});

/**
 * POST /api/comments
 * 发表评论
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.permissions.can_comment) {
      res.status(403).json({ code: 403, message: '无评论权限' });
      return;
    }

    const { documentId, content, replyToId } = req.body;

    if (!documentId || !content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ code: 400, message: 'documentId 和 content 不能为空' });
      return;
    }

    // 验证 documentId 对应的文件存在
    const [fileNodes] = await pool.query(
      "SELECT node_id FROM file_nodes WHERE node_id = ? AND node_type = 'file'",
      [documentId]
    ) as any[];
    if (!(fileNodes as any[]).length) {
      res.status(404).json({ code: 404, message: '关联文档不存在' });
      return;
    }

    // 如果是回复，获取被回复评论的作者
    let replyToUserId: number | null = null;
    if (replyToId) {
      const [replyComments] = await pool.query(
        'SELECT commenter_id FROM comments WHERE comment_id = ?',
        [replyToId]
      ) as any[];
      if ((replyComments as any[]).length) {
        replyToUserId = (replyComments as any[])[0].commenter_id;
      } else {
        res.status(404).json({ code: 404, message: '被回复的评论不存在' });
        return;
      }
    }

    const [result] = await pool.query(
      'INSERT INTO comments (file_id, content, commenter_id, reply_to_comment_id, reply_to_user_id) VALUES (?, ?, ?, ?, ?)',
      [documentId, content.trim(), user.user_id, replyToId ?? null, replyToUserId]
    ) as any[];

    res.json({ code: 200, message: 'success', data: { id: (result as any).insertId } });
  } catch (err) {
    console.error('[Comments] Create error:', err);
    res.status(500).json({ code: 500, message: '发表评论失败' });
  }
});

/**
 * DELETE /api/comments/:id
 * 删除评论（只能删除自己的评论）
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const commentId = req.params.id;
    const user = req.user!;

    if (isNaN(Number(commentId))) {
      res.status(400).json({ code: 400, message: '无效的评论 ID' });
      return;
    }

    const [comments] = await pool.query(
      'SELECT commenter_id FROM comments WHERE comment_id = ?',
      [commentId]
    ) as any[];

    if (!(comments as any[]).length) {
      res.status(404).json({ code: 404, message: '评论不存在' });
      return;
    }

    if ((comments as any[])[0].commenter_id !== user.user_id) {
      res.status(403).json({ code: 403, message: '无法删除他人的评论' });
      return;
    }

    await pool.query('DELETE FROM comments WHERE comment_id = ?', [commentId]);
    res.json({ code: 200, message: 'success' });
  } catch (err) {
    console.error('[Comments] Delete error:', err);
    res.status(500).json({ code: 500, message: '删除评论失败' });
  }
});

export default router;
