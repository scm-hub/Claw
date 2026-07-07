import { Router } from 'express';
import * as authService from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';
import { getClientIp } from '../middleware/operationLogger.js';

const router = Router();

/**
 * POST /api/auth/login
 * 统一登录 — 通过 HRMS API 验证身份，签发 SSO 令牌
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: '请输入邮箱和密码' });
    }

    const clientInfo = {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
    };

    const result = await authService.login(email, password, clientInfo);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息（需携带 SSO 令牌）
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userInfo = await authService.verifyToken(
      req.headers.authorization.split(' ')[1]
    );
    res.json({ success: true, data: userInfo });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/auth/verify
 * 验证令牌有效性（子系统可调用此接口验证令牌）
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: '缺少 token' });
    }
    const userInfo = await authService.verifyToken(token);
    res.json({ success: true, data: userInfo });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * 刷新令牌
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: '缺少 token' });
    }
    const newToken = await authService.refreshToken(token);
    res.json({ success: true, data: { token: newToken } });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/auth/access-system
 * 记录用户访问某系统（审计日志）
 */
router.post('/access-system', authenticate, async (req, res, next) => {
  try {
    const { systemCode } = req.body;
    if (!systemCode) {
      return res.status(400).json({ success: false, message: '缺少 systemCode' });
    }

    // 检查用户是否有权限访问该系统
    if (!req.user.systems.includes(systemCode)) {
      return res.status(403).json({ success: false, message: '无权访问该系统' });
    }

    const clientInfo = {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
    };

    await authService.logSystemAccess(req.user.email, systemCode, clientInfo);
    res.json({ success: true, message: '访问记录已保存' });
  } catch (err) {
    next(err);
  }
});

export default router;
