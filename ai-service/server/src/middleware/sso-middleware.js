import jwt from 'jsonwebtoken';

const SSO_JWT_SECRET = process.env.SSO_JWT_SECRET || 'xdj-portal-sso-secret-2026';

/**
 * SSO 令牌验证中间件
 */
export function ssoAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SSO_JWT_SECRET);
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

export default ssoAuth;
