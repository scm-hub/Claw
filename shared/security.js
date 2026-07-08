/**
 * 共享安全中间件模块
 * 各子系统可复用统一的限流和安全策略
 *
 * 使用方式：
 *   import { applySecurity, createLimiter, ALLOWED_ORIGINS } from '../../../shared/security.js';
 *   applySecurity(app);  // 一键应用 helmet + 限流
 *   createLimiter({ max: 10 })  // 自定义限流（如登录接口）
 */

import rateLimit from 'express-rate-limit';

// 统一允许的来源列表
export const ALLOWED_ORIGINS = [
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://192.168.21.34:5174',
  'http://192.168.21.34:5173',
  'http://192.168.21.34:5175',
  'http://192.168.21.34:5176',
  'http://111.17.201.197:5174',
];

/**
 * 创建限流中间件
 * @param {Object} opts - { windowMs?: number, max?: number, message?: string }
 */
export function createLimiter(opts = {}) {
  return rateLimit({
    windowMs: opts.windowMs || 15 * 60 * 1000,
    max: opts.max || 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: opts.message || '请求过于频繁，请稍后再试' },
    skipSuccessfulRequests: opts.skipSuccessfulRequests || false,
  });
}

/**
 * 登录接口专用限流（更严格）
 */
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: '登录尝试过于频繁，请 15 分钟后再试',
});

/**
 * API 写入操作限流
 */
export const writeLimiter = createLimiter({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: '操作过于频繁，请稍后再试',
});
