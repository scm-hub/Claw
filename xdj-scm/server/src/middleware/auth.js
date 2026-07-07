import jwt from 'jsonwebtoken';
import prisma from '../shared/prisma.js';

// JWT 验证中间件
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }

    const token = authHeader.split(' ')[1];

    // 尝试用两个 secret 验证（SCM 自身令牌 或 Portal SSO 令牌）
    let decoded = null;
    const secrets = [
      process.env.JWT_SECRET || 'xdj-scm-jwt-secret-2026',
      process.env.SSO_JWT_SECRET || 'xdj-portal-sso-secret-2026',
    ];
    for (const secret of secrets) {
      try {
        decoded = jwt.verify(token, secret);
        break;
      } catch (e) {
        // 继续尝试下一个 secret
      }
    }

    if (!decoded) {
      return res.status(401).json({ success: false, message: '令牌无效或已过期' });
    }

    // 查询用户，确保用户仍然有效
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        employee: {
          include: { department: true },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: '用户不存在或已禁用' });
    }

    // 挂载到 req
    req.user = {
      id: user.id,
      userId: user.id,
      employeeId: user.employeeId,
      // 优先使用 JWT 中的 globalId（来自 Portal SSO，与 workflow-engine 匹配一致）
      globalId: decoded.globalId || user.employee?.globalId || null,
      role: user.role,
      username: user.username,
      name: user.employee?.name || decoded.employeeName || user.username,
      email: user.employee?.email || decoded.email || user.username,
      departmentId: user.employee?.departmentId,
      department: user.employee?.department,
      permissions: decoded.permissions || [], // 从 JWT 读取模块权限
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '令牌无效或已过期' });
    }
    next(err);
  }
}

// 可选认证（不强制，但如果有token就解析）
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  return authenticate(req, res, next);
}
