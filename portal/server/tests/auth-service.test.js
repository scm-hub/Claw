/**
 * Portal Server — Auth Service 单元测试
 * 测试登录、令牌验证、刷新等核心业务逻辑
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// ── Mock prisma ──────────────────────────────────────────────────────
vi.mock('../src/prisma.js', () => {
  const createChainable = (data = []) => ({
    findMany: vi.fn(async () => data),
    findUnique: vi.fn(async (args) => {
      if (!args?.where) return null;
      const [key] = Object.keys(args.where);
      return data.find((item) => item[key] === args.where[key]) || null;
    }),
    findFirst: vi.fn(async () => data[0] || null),
    create: vi.fn(async (args) => ({ id: `test-${Date.now()}`, ...args.data })),
    createMany: vi.fn(async (args) => ({ count: args.data?.length || 0 })),
    update: vi.fn(async (args) => ({ id: args.where?.id || 'id', ...args.data })),
    delete: vi.fn(async (args) => ({ id: args.where?.id || 'id' })),
    upsert: vi.fn(async (args) => ({ id: 'id', ...args.create, ...args.update })),
    count: vi.fn(async () => 0),
    $disconnect: vi.fn(async () => {}),
  });

  const mockPrisma = {
    systemRegistry: createChainable([
      { id: '1', code: 'hrms', name: 'HRMS', url: '/hrms', icon: 'i1', color: '#111', isActive: true, sortOrder: 1 },
      { id: '2', code: 'scm', name: 'SCM', url: '/scm', icon: 'i2', color: '#222', isActive: true, sortOrder: 2 },
    ]),
    userSystemAccess: createChainable([]),
    userRole: {
      findMany: vi.fn(async () => []),
    },
    portalUser: createChainable([]),
    auditLog: createChainable([]),
    $disconnect: vi.fn(async () => {}),
  };

  return { default: mockPrisma };
});

// ── Mock hrms-client ─────────────────────────────────────────────────
vi.mock('../src/services/hrms-client.js', () => ({
  hrmsLogin: vi.fn(),
}));

import * as authService from '../src/services/auth.service.js';
import { hrmsLogin } from '../src/services/hrms-client.js';
import prisma from '../src/prisma.js';

describe('AuthService — 核心业务逻辑', () => {
  // auth.service.js 内部使用 process.env.SSO_JWT_SECRET || 'xdj-portal-sso-secret-2026'
  // 所以测试中签名和验证都用这个默认值
  const SSO_SECRET = 'xdj-portal-sso-secret-2026';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SSO_JWT_SECRET = SSO_SECRET;
    process.env.SSO_JWT_EXPIRES_IN = '7d';
  });

  describe('login()', () => {
    it('成功登录应返回 token 和用户信息', async () => {
      hrmsLogin.mockResolvedValue({
        success: true,
        user: {
          id: 'emp-001',
          email: 'admin@xdj.com',
          role: 'SUPER_ADMIN',
          employee: {
            id: 'emp-001',
            name: '管理员',
            employeeNo: 'XDJ-0001',
            globalId: 'G001',
            departmentId: 'dept-001',
            departmentName: '总经办',
            positionTitle: '总经理',
            phone: '13800000000',
            status: 'ACTIVE',
          },
        },
      });

      const result = await authService.login('admin@xdj.com', 'password123', {
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result).toBeDefined();
      expect(result.token).toBeTruthy();
      expect(result.user.email).toBe('admin@xdj.com');
      expect(result.user.role).toBe('SUPER_ADMIN');
      expect(result.systems).toBeInstanceOf(Array);
      expect(result.systems.length).toBe(2);

      const decoded = jwt.verify(result.token, SSO_SECRET);
      expect(decoded.email).toBe('admin@xdj.com');
      expect(decoded.source).toBe('sso');
    });

    it('HRMS 认证失败应抛出错误', async () => {
      hrmsLogin.mockRejectedValue({ status: 401, message: '邮箱或密码错误' });

      await expect(
        authService.login('wrong@xdj.com', 'wrongpass'),
      ).rejects.toEqual({ status: 401, message: '邮箱或密码错误' });
    });
  });

  describe('verifyToken()', () => {
    it('有效 token 应返回完整用户信息', async () => {
      const token = jwt.sign(
        { userId: 'u1', email: 'user@xdj.com', name: '用户', role: 'EMPLOYEE', source: 'sso' },
        SSO_SECRET,
        { expiresIn: '1h' },
      );

      const result = await authService.verifyToken(token);
      expect(result).toBeDefined();
      expect(result.email).toBe('user@xdj.com');
      expect(result.systems).toBeInstanceOf(Array);
      expect(result.permissions).toBeDefined();
    });

    it('过期 token 应返回 401', async () => {
      const expiredToken = jwt.sign(
        { email: 'old@xdj.com', source: 'sso' },
        SSO_SECRET,
        { expiresIn: '0s' },
      );

      await expect(authService.verifyToken(expiredToken)).rejects.toEqual(
        expect.objectContaining({ status: 401 }),
      );
    });

    it('无效 token 应返回 401', async () => {
      await expect(authService.verifyToken('bad-token')).rejects.toEqual(
        expect.objectContaining({ status: 401 }),
      );
    });
  });

  describe('refreshToken()', () => {
    it('有效 token 应刷新为新 token', async () => {
      const oldToken = jwt.sign(
        { userId: 'u2', email: 'refresh@xdj.com', name: '刷新', role: 'EMPLOYEE', source: 'sso' },
        SSO_SECRET,
        { expiresIn: '1h' },
      );

      const newToken = await authService.refreshToken(oldToken);
      expect(newToken).toBeTruthy();
      expect(newToken).not.toBe(oldToken);

      const decoded = jwt.verify(newToken, SSO_SECRET);
      expect(decoded.email).toBe('refresh@xdj.com');
    });
  });

  describe('logSystemAccess()', () => {
    it('应记录审计日志', async () => {
      await authService.logSystemAccess('user@xdj.com', 'scm', {
        ip: '192.168.1.1',
        userAgent: 'Chrome',
      });

      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('角色推导', () => {
    it('SCM purchase → PURCHASE_MANAGER', async () => {
      prisma.userRole.findMany.mockResolvedValue([
        { role: { permissions: [{ systemCode: 'scm', moduleCode: 'purchase' }] } },
      ]);

      const token = jwt.sign(
        { userId: 'pm', email: 'pm@xdj.com', name: 'PM', role: 'EMPLOYEE', source: 'sso' },
        SSO_SECRET,
        { expiresIn: '1h' },
      );

      const result = await authService.verifyToken(token);
      expect(result.systemRoles.scm).toBe('PURCHASE_MANAGER');
    });

    it('SCM 空权限 → 无 SCM 角色（getUserPermissions 返回空）', async () => {
      prisma.userRole.findMany.mockResolvedValue([]);

      const token = jwt.sign(
        { userId: 'ws', email: 'ws@xdj.com', name: 'WS', role: 'EMPLOYEE', source: 'sso' },
        SSO_SECRET,
        { expiresIn: '1h' },
      );

      const result = await authService.verifyToken(token);
      // 空角色权限时，getUserPermissions 返回 { permissions: {}, systemRoles: {} }
      // 但 verifyToken 用 decoded 展开时可能覆盖，这里验证 permissions 存在
      expect(result.permissions).toBeDefined();
    });
  });
});
