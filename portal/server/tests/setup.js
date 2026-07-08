/**
 * Portal Server 测试环境设置
 * 模拟 Prisma 数据库层，不连接真实数据库
 */
import { vi } from 'vitest';

// ── 模拟 Prisma Client ──────────────────────────────────────────────
vi.mock('../src/prisma.js', () => {
  const { createMockPrisma } = await import('./helpers/mock-prisma.js');
  return { default: createMockPrisma() };
});

// ── 模拟 dotenv ────────────────────────────────────────────────────
vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

// ── 设置环境变量 ──────────────────────────────────────────────────
process.env.SSO_JWT_SECRET = 'test-sso-secret-2026';
process.env.SSO_JWT_EXPIRES_IN = '7d';
process.env.HRMS_API_URL = 'http://localhost:4002';
process.env.HRMS_ADMIN_PASSWORD = '123456';
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
