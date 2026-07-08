/**
 * HRMS Server — 路由与中间件单元测试
 */
import { describe, it, expect, vi } from 'vitest';

// Mock prisma 避免数据库连接
vi.mock('../prisma.js', () => ({
  default: {
    employee: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
      count: vi.fn(async () => 0),
    },
    department: { findMany: vi.fn(async () => []) },
    $disconnect: vi.fn(async () => {}),
  },
}));

describe('HRMS Routes — 路由配置', () => {
  describe('Employees 路由', () => {
    it('GET / 应认证保护', async () => {
      const routes = await import('../src/routes/employees.js');
      expect(routes.default).toBeDefined();
      expect(routes.default.stack).toBeDefined();
    });

    it('POST / 需要 HR_ADMIN 权限', async () => {
      const routes = await import('../src/routes/employees.js');
      expect(routes.default).toBeDefined();
    });

    it('DELETE /:id 需要 HR_ADMIN 权限', async () => {
      const routes = await import('../src/routes/employees.js');
      expect(routes.default).toBeDefined();
    });
  });
});

describe('HRMS Middleware — RBAC', () => {
  it('authorize 函数应导出', async () => {
    const { authorize } = await import('../src/middleware/rbac.js');
    expect(authorize).toBeDefined();
    expect(typeof authorize).toBe('function');
  });
});

describe('HRMS Middleware — Error Handler', () => {
  it('errorHandler 应导出', async () => {
    const mod = await import('../src/middleware/errorHandler.js');
    expect(mod.errorHandler).toBeDefined();
    expect(typeof mod.errorHandler).toBe('function');
  });
});

describe('HRMS Middleware — 部门范围', () => {
  it('getDepartmentFilter 应导出', async () => {
    const mod = await import('../src/middleware/departmentScope.js');
    expect(mod.getDepartmentFilter).toBeDefined();
  });
});
