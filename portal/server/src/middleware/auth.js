import jwt from 'jsonwebtoken';

const SSO_JWT_SECRET = process.env.SSO_JWT_SECRET || 'xdj-portal-sso-secret-2026';

/**
 * SSO JWT 验证中间件
 * 用于验证来自 SSO 中心的令牌
 *
 * 此中间件同时作为共享文件提供给子系统使用：
 * portal/shared/sso-middleware.js
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SSO_JWT_SECRET);

    // 只接受 SSO 签发的令牌
    if (decoded.source !== 'sso') {
      return res.status(401).json({ success: false, message: '非 SSO 令牌' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '令牌已过期' });
    }
    return res.status(401).json({ success: false, message: '令牌无效' });
  }
}

/**
 * 管理员权限校验
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '未认证' });
  }
  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: '需要管理员权限' });
  }
  next();
}
