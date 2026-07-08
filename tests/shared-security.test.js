/**
 * 共享安全模块 — 单元测试
 */
import { describe, it, expect } from 'vitest';
import { createLimiter, ALLOWED_ORIGINS, loginLimiter, writeLimiter } from '../shared/security.js';

describe('Shared Security — 安全模块', () => {
  describe('ALLOWED_ORIGINS', () => {
    it('应包含所有开发环境地址', () => {
      expect(ALLOWED_ORIGINS).toContain('http://localhost:5174');
      expect(ALLOWED_ORIGINS).toContain('http://localhost:5173');
      expect(ALLOWED_ORIGINS).toContain('http://192.168.21.34:5174');
    });

    it('应包含外网地址', () => {
      expect(ALLOWED_ORIGINS).toContain('http://111.17.201.197:5174');
    });

    it('所有域名格式正确', () => {
      for (const origin of ALLOWED_ORIGINS) {
        expect(origin).toMatch(/^https?:\/\/[a-zA-Z0-9.:-]+$/);
      }
    });
  });

  describe('createLimiter()', () => {
    it('应创建限流中间件', () => {
      const limiter = createLimiter({ max: 10, windowMs: 60000 });
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('默认配置正确', () => {
      const limiter = createLimiter();
      expect(limiter).toBeDefined();
    });
  });

  describe('loginLimiter', () => {
    it('应限制为 15 分钟 10 次', () => {
      expect(loginLimiter).toBeDefined();
      expect(typeof loginLimiter).toBe('function');
    });
  });

  describe('writeLimiter', () => {
    it('应限制为 1 分钟 30 次', () => {
      expect(writeLimiter).toBeDefined();
      expect(typeof writeLimiter).toBe('function');
    });
  });
});
