/**
 * Mock Prisma Client — 用于单元测试
 * 提供可控的数据库模拟，不依赖真实 MySQL
 */
import { vi } from 'vitest';

/**
 * 创建可配置的 mock Prisma 实例
 * @param {Object} overrides - 自定义数据返回
 */
export function createMockPrisma(overrides = {}) {
  const mockData = {
    // 系统注册表
    systemRegistry: [
      {
        id: 'sys-001',
        code: 'hrms',
        name: '人力资源管理系统',
        url: '/hrms',
        icon: 'PeopleIcon',
        color: '#1976d2',
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'sys-002',
        code: 'scm',
        name: '供应链管理系统',
        url: '/scm',
        icon: 'InventoryIcon',
        color: '#2e7d32',
        isActive: true,
        sortOrder: 2,
      },
      {
        id: 'sys-003',
        code: 'mdm',
        name: '主数据管理系统',
        url: '/mdm',
        icon: 'StorageIcon',
        color: '#ed6c02',
        isActive: true,
        sortOrder: 3,
      },
    ],

    // 用户系统访问权限
    userSystemAccess: [],

    // 用户角色
    userRoles: [],

    // 审计日志
    auditLogs: [],

    // Portal 用户缓存
    portalUsers: [],
    ...overrides,
  };

  // 创建可链式调用的 mock 方法
  const createChainableMethods = (dataKey, data) => ({
    findMany: vi.fn(async (args) => {
      const items = data || mockData[dataKey] || [];
      if (args?.where) return items.filter(() => true); // 简化：返回所有
      return items;
    }),
    findUnique: vi.fn(async (args) => {
      const items = data || mockData[dataKey] || [];
      if (!args?.where) return null;
      // 简化：按第一个 where 条件匹配
      const [key] = Object.keys(args.where);
      const value = args.where[key];
      return items.find((item) => item[key] === value) || null;
    }),
    findFirst: vi.fn(async (args) => {
      const items = data || mockData[dataKey] || [];
      if (!args?.where) return items[0] || null;
      return items.find(() => true) || items[0] || null;
    }),
    create: vi.fn(async (args) => {
      const newItem = { id: `test-${Date.now()}`, ...args.data };
      if (!mockData[dataKey]) mockData[dataKey] = [];
      mockData[dataKey].push(newItem);
      return newItem;
    }),
    createMany: vi.fn(async (args) => {
      return { count: args.data?.length || 0 };
    }),
    update: vi.fn(async (args) => {
      return { id: args.where?.id || 'test-id', ...args.data };
    }),
    updateMany: vi.fn(async () => ({ count: 1 })),
    delete: vi.fn(async (args) => {
      return { id: args.where?.id || 'test-id' };
    }),
    deleteMany: vi.fn(async () => ({ count: 1 })),
    upsert: vi.fn(async (args) => {
      return { id: 'test-id', ...args.create, ...args.update };
    }),
    count: vi.fn(async () => 0),
    aggregate: vi.fn(async () => ({ _count: 0 })),
    include: {
      role: {
        include: {
          permissions: {
            findMany: vi.fn(async () => []),
          },
        },
      },
    },
  });

  return {
    systemRegistry: createChainableMethods('systemRegistry'),
    userSystemAccess: createChainableMethods('userSystemAccess'),
    userRole: {
      findMany: vi.fn(async (args) => {
        if (args?.include?.role?.include?.permissions) {
          return [
            {
              role: {
                permissions: [
                  { systemCode: 'hrms', moduleCode: 'employees' },
                  { systemCode: 'scm', moduleCode: 'purchase' },
                ],
              },
            },
          ];
        }
        return [];
      }),
    },
    portalUser: createChainableMethods('portalUsers'),
    auditLog: createChainableMethods('auditLogs'),
    $disconnect: vi.fn(async () => {}),
    $transaction: vi.fn(async (fn) => fn(this)),
  };
}
