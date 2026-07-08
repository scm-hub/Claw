/**
 * 统一网关服务 gateway.js
 * 监听 5174 端口，通过路径前缀分发到各子系统
 *
 * 路径规则：
 *   /              → Portal (static dist)          后端 API: /api → 4001
 *   /scm/*         → SCM PC 端 (static dist)       后端 API: /scm/api → 4003
 *   /mobile/*      → SCM 移动端 (static dist)      后端 API: /mobile/api → 4003
 *   /hrms/*        → HRMS 人力系统 (static dist)    后端 API: /hrms/api → 4002
 *   /mdm/*         → MDM 主数据 (static dist)       后端 API: /mdm/api → 4005
 *   /ai/*          → AI 智能服务 (static dist)        后端 API: /ai/api → 4004
 *   /workflow/api  → Workflow Engine (无前端，仅API)     后端 API: → 4011
 */

import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ── 安全中间件 ──────────────────────────────────────────────────────────────
// 安全 HTTP 头
app.use(helmet({ contentSecurityPolicy: false }));

// 全局限流（网关层，所有请求的总入口）
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '请求过于频繁，请稍后再试' },
  }),
);

// ── 子系统配置 ────────────────────────────────────────────────────────────
const SUBSYSTEMS = [
  {
    prefix: '/scm',
    dist: path.join(__dirname, 'xdj-scm/client/dist'),
    apiTarget: 'http://localhost:4003',
  },
  {
    prefix: '/mobile',
    dist: path.join(__dirname, 'xdj-scm/mobile/dist'),
    apiTarget: 'http://localhost:4003',
  },
  {
    prefix: '/hrms',
    dist: path.join(__dirname, 'hrms/client/dist'),
    apiTarget: 'http://localhost:4002',
  },
  {
    prefix: '/mdm',
    dist: path.join(__dirname, 'mdm/client/dist'),
    apiTarget: 'http://localhost:4005',
  },
  {
    prefix: '/ai',
    dist: path.join(__dirname, 'ai-service/client/dist'),
    apiTarget: 'http://localhost:4004',
  },
];

// Portal 配置（根路径）
const PORTAL_DIST = path.join(__dirname, 'portal/client/dist');
const PORTAL_API = 'http://localhost:4001';

// ── 工具函数 ──────────────────────────────────────────────────────────────
function spaFallback(distDir) {
  return (req, res, next) => {
    const indexFile = path.join(distDir, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      res.status(404).send(`子系统 ${distDir} 尚未构建，请先执行 npm run build`);
    }
  };
}

// ── 各子系统路由 ──────────────────────────────────────────────────────────
for (const sys of SUBSYSTEMS) {
  const router = express.Router();

  // 1. API 代理：/scm/api/xxx → localhost:4003/api/xxx
  router.use(
    '/api',
    createProxyMiddleware({
      target: sys.apiTarget,
      changeOrigin: true,
      pathRewrite: (path) => `/api${path}`,
      timeout: 180000,
      proxyTimeout: 180000,
      on: {
        error: (err, req, res) => {
          console.error(`[GW] API proxy error (${sys.prefix}):`, err.message);
          res.status(502).json({ success: false, message: '子系统服务暂不可用' });
        },
      },
    })
  );

  // 1b. 上传文件代理：/scm/uploads/xxx → localhost:4003/uploads/xxx
  // http-proxy-middleware 默认会剥离匹配路径 /uploads，需通过 pathRewrite 重新拼回
  router.use(
    '/uploads',
    createProxyMiddleware({
      target: sys.apiTarget,
      changeOrigin: true,
      pathRewrite: (p) => '/uploads' + p,
      on: {
        error: (err, req, res) => {
          console.error(`[GW] Uploads proxy error (${sys.prefix}):`, err.message);
          res.status(502).json({ success: false, message: '文件服务暂不可用' });
        },
      },
    })
  );

  // 2. 静态文件 & SPA fallback — 所有响应强制不缓存，确保部署后立即生效
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
  router.use(express.static(sys.dist, { index: false }));

  // 3. SPA fallback（所有非静态资源请求返回 index.html）
  router.use(spaFallback(sys.dist));

  app.use(sys.prefix, router);
}

// ── Portal 路由（根路径）────────────────────────────────────────────────
// Portal API 代理（保留 /api 前缀，http-proxy-middleware 默认会剥离匹配路径）
app.use(
  '/api',
  createProxyMiddleware({
    target: PORTAL_API,
    changeOrigin: true,
    pathRewrite: (path) => `/api${path}`,
    on: {
      error: (err, req, res) => {
        console.error('[GW] Portal API proxy error:', err.message);
        res.status(502).json({ success: false, message: 'Portal 服务暂不可用' });
      },
    },
  })
);

// Workflow Engine API 代理 — /workflow/api → localhost:4011/api
// Portal 前端通过 /workflow/api/workflow/xxx 访问审批引擎
app.use(
  '/workflow/api',
  createProxyMiddleware({
    target: 'http://localhost:4011',
    changeOrigin: true,
    pathRewrite: (path) => `/api${path}`,
    on: {
      error: (err, req, res) => {
        console.error('[GW] Workflow API proxy error:', err.message);
        res.status(502).json({ success: false, message: '审批引擎服务暂不可用' });
      },
    },
  })
);

// Portal 静态文件 & SPA fallback — 所有响应强制不缓存
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(PORTAL_DIST, { index: false }));

// Portal SPA fallback
app.use(spaFallback(PORTAL_DIST));

// ── 启动 ──────────────────────────────────────────────────────────────────
const PORT = 5174;
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('  统一网关服务已启动');
  console.log('========================================');
  console.log(`  外网访问: http://111.17.201.197:${PORT}`);
  console.log(`  局域网:   http://192.168.21.34:${PORT}`);
  console.log(`  本机:     http://localhost:${PORT}`);
  console.log('');
  console.log('  路径路由规则:');
  console.log(`  /         → Portal (SSO 登录中心)`);
  console.log(`  /scm/*    → SCM 供应链管理 (PC 端)`);
  console.log(`  /mobile/* → SCM 移动端`);
  console.log(`  /hrms/*   → HRMS 人力资源系统`);
  console.log(`  /mdm/*    → MDM 主数据系统`);
  console.log(`  /ai/*     → AI 智能服务`);
  console.log(`  /workflow/api → Workflow 审批引擎`);
  console.log('========================================\n');
});
