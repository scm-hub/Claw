import jwt from 'jsonwebtoken';
import { ssoAuth } from './sso-middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mdm-local-jwt-secret-2026';
const SSO_JWT_SECRET = process.env.SSO_JWT_SECRET || 'xdj-portal-sso-secret-2026';

/**
 * MDM 本地认证中间件
 * 优先验证 SSO 令牌，失败再验证本地 JWT
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];

  // 先尝试 SSO 令牌
  try {
    const decoded = jwt.verify(token, SSO_JWT_SECRET);
    if (decoded.source === 'sso') {
      req.user = decoded;
      return next();
    }
  } catch (err) {
    // 不是 SSO 令牌，继续尝试本地 JWT
  }

  // 尝试本地 JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '令牌已过期' });
    }
    return res.status(401).json({ success: false, message: '令牌无效' });
  }
}

export { ssoAuth };
