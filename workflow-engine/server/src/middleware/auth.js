// SSO 认证中间件 — 验证 SSO token（与 Portal 共用密钥）

import jwt from 'jsonwebtoken';

const SSO_SECRET = process.env.SSO_JWT_SECRET || 'xdj-portal-sso-secret-2026';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SSO_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '令牌已过期' });
    }
    return res.status(401).json({ success: false, message: '无效令牌' });
  }
}

// 内部服务间认证（SCM/HRMS 调 workflow-engine 时的认证）
export function internalAuth(req, res, next) {
  const secret = req.headers['x-internal-secret'];
  const expected = process.env.INTERNAL_API_SECRET || 'xdj-internal-api-secret-2026';

  if (secret === expected) {
    return next();
  }

  // 也支持 SSO token 认证（子系统通过 Portal SSO token 调用）
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], SSO_SECRET);
      req.user = decoded;
      return next();
    } catch {}
  }

  return res.status(401).json({ success: false, message: '内部服务认证失败' });
}
