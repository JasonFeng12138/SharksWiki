import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, Permissions } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sharkswiki_secret_key';

/**
 * JWT 鉴权中间件，验证 Authorization: Bearer <token> 头部
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '未登录，请先登录' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthRequest['user'];
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ code: 401, message: 'Token 无效或已过期，请重新登录' });
  }
}

/**
 * 权限检查中间件工厂，需在 authMiddleware 之后使用
 */
export function requirePermission(permission: keyof Permissions) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ code: 401, message: '未登录' });
      return;
    }
    if (!req.user.permissions[permission]) {
      res.status(403).json({ code: 403, message: '权限不足' });
      return;
    }
    next();
  };
}

/** 判断是否为管理员（拥有 can_admin 权限） */
export function isAdmin(req: AuthRequest): boolean {
  return Boolean(req.user?.permissions?.can_admin);
}
