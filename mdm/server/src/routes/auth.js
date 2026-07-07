import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mdm-local-jwt-secret-2026';
const SSO_JWT_SECRET = process.env.SSO_JWT_SECRET || 'xdj-portal-sso-secret-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * SSO 登录 — 用 Portal SSO 令牌换取 MDM 本地令牌
 * POST /api/auth/sso-login
 * body: { ssoToken: "xxx" }
 */
router.post('/sso-login', async (req, res) => {
  try {
    const { ssoToken } = req.body;
    if (!ssoToken) {
      return res.status(400).json({ success: false, message: '缺少 SSO 令牌' });
    }

    // 验证 SSO 令牌
    const decoded = jwt.verify(ssoToken, SSO_JWT_SECRET);
    if (decoded.source !== 'sso') {
      return res.status(401).json({ success: false, message: '非 SSO 令牌' });
    }

    // 检查 MDM 模块权限：无 MDM 权限的用户不允许访问
    if (!decoded.permissions?.mdm || decoded.permissions.mdm.length === 0) {
      return res.status(403).json({
        success: false,
        message: '您的账号未配置主数据管理系统权限，请联系管理员',
      });
    }

    // 签发 MDM 本地令牌 — 携带 globalId、permissions、systemRoles
    const localToken = jwt.sign({
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      globalId: decoded.globalId || null,
      employeeId: decoded.employeeId,
      employeeNo: decoded.employeeNo,
      departmentId: decoded.departmentId,
      departmentName: decoded.departmentName,
      permissions: decoded.permissions,
      systemRoles: decoded.systemRoles,
      source: 'mdm-local',
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      success: true,
      data: {
        token: localToken,
        user: {
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          globalId: decoded.globalId || null,
          employeeId: decoded.employeeId,
          employeeNo: decoded.employeeNo,
          departmentId: decoded.departmentId,
          departmentName: decoded.departmentName,
          permissions: decoded.permissions,
          systemRoles: decoded.systemRoles,
        },
      },
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'SSO 令牌已过期' });
    }
    return res.status(401).json({ success: false, message: 'SSO 令牌无效' });
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      globalId: req.user.globalId || null,
      employeeId: req.user.employeeId,
      employeeNo: req.user.employeeNo,
      departmentId: req.user.departmentId,
      departmentName: req.user.departmentName,
      permissions: req.user.permissions || {},
      systemRoles: req.user.systemRoles || {},
    },
  });
});

export default router;
