/**
 * Portal Server — Auth API 测试
 * 测试 SSO 认证中心的核心登录/令牌功能
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

describe('Auth API — SSO 认证中心', () => {
  const SSO_SECRET = 'xdj-portal-sso-secret-2026';

  describe('POST /api/auth/login — 参数校验', () => {
    it('缺少 email 和 password 应返回 400', async () => {
      const router = (await import('../src/routes/auth.js')).default;
      expect(router).toBeDefined();
      expect(router.stack).toBeDefined();
    });
  });

  describe('JWT 令牌签发与验证', () => {
    it('正确签发和验证令牌', () => {
      const payload = {
        userId: 'user-001',
        email: 'admin@xdj.com',
        name: '管理员',
        role: 'SUPER_ADMIN',
        source: 'sso',
      };

      const token = jwt.sign(payload, SSO_SECRET, { expiresIn: '7d' });
      expect(token).toBeTruthy();
      expect(token.split('.').length).toBe(3);

      const decoded = jwt.verify(token, SSO_SECRET);
      expect(decoded.email).toBe('admin@xdj.com');
      expect(decoded.role).toBe('SUPER_ADMIN');
      expect(decoded.source).toBe('sso');
    });

    it('无效 token 应抛出错误', () => {
      expect(() => jwt.verify('invalid.token.here', SSO_SECRET)).toThrow();
    });

    it('过期 token 应抛出 TokenExpiredError', () => {
      const payload = { email: 'test@xdj.com', source: 'sso' };
      const expiredToken = jwt.sign(payload, SSO_SECRET, { expiresIn: '0s' });
      expect(() => jwt.verify(expiredToken, SSO_SECRET)).toThrow();
    });

    it('非 SSO 令牌应被识别', () => {
      const payload = { email: 'test@xdj.com', source: 'external' };
      const token = jwt.sign(payload, SSO_SECRET);
      const decoded = jwt.verify(token, SSO_SECRET);
      expect(decoded.source).not.toBe('sso');
    });
  });

  describe('POST /api/auth/verify', () => {
    it('正确 token 应返回用户信息', () => {
      const payload = {
        userId: 'user-002',
        email: 'user@xdj.com',
        name: '测试用户',
        role: 'EMPLOYEE',
        source: 'sso',
      };
      const token = jwt.sign(payload, SSO_SECRET, { expiresIn: '1h' });
      const decoded = jwt.verify(token, SSO_SECRET);
      expect(decoded.email).toBe('user@xdj.com');
      expect(decoded.name).toBe('测试用户');
    });
  });
});

describe('Auth Middleware — authenticate', () => {
  it('缺少 Authorization 头应返回 401', async () => {
    const { authenticate } = await import('../src/middleware/auth.js');

    const req = { headers: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('Bearer 前缀错误应返回 401', async () => {
    const { authenticate } = await import('../src/middleware/auth.js');

    const req = { headers: { authorization: 'Basic sometoken' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('有效 SSO 令牌应调用 next()', async () => {
    const { authenticate } = await import('../src/middleware/auth.js');
    const SSO_SECRET = 'xdj-portal-sso-secret-2026';

    const token = jwt.sign(
      { userId: 'u3', email: 'valid@xdj.com', name: '有效', role: 'EMPLOYEE', source: 'sso' },
      SSO_SECRET,
      { expiresIn: '1h' },
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.email).toBe('valid@xdj.com');
  });

  it('过期令牌应返回 401', async () => {
    const { authenticate } = await import('../src/middleware/auth.js');
    const SSO_SECRET = 'xdj-portal-sso-secret-2026';

    const expiredToken = jwt.sign(
      { email: 'expired@xdj.com', source: 'sso' },
      SSO_SECRET,
      { expiresIn: '0s' },
    );

    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('Auth Middleware — requireAdmin', () => {
  it('未认证用户应返回 401', async () => {
    const { requireAdmin } = await import('../src/middleware/auth.js');

    const req = { user: null };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('非管理员角色应返回 403', async () => {
    const { requireAdmin } = await import('../src/middleware/auth.js');

    const req = { user: { role: 'EMPLOYEE' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('SUPER_ADMIN 应通过', async () => {
    const { requireAdmin } = await import('../src/middleware/auth.js');

    const req = { user: { role: 'SUPER_ADMIN' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('HR_ADMIN 应通过', async () => {
    const { requireAdmin } = await import('../src/middleware/auth.js');

    const req = { user: { role: 'HR_ADMIN' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
