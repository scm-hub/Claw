/**
 * HRMS Server — 安全与限流测试
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

describe('HRMS — 安全中间件', () => {
  describe('Helmet 安全头', () => {
    it('应包含基本安全头', async () => {
      const app = express();
      app.use(helmet());
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Rate Limiting 限流', () => {
    it('正常请求应通过', async () => {
      const app = express();
      app.use(rateLimit({ windowMs: 60000, max: 100, legacyHeaders: false }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('超限请求应返回 429', async () => {
      const app = express();
      app.use(rateLimit({
        windowMs: 60000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false,
      }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      // 前 2 次正常
      await request(app).get('/test');
      await request(app).get('/test');

      // 第 3 次应被限流
      const res = await request(app).get('/test');
      expect(res.status).toBe(429);
    });
  });

  describe('CORS 配置', () => {
    it('白名单内域名应被允许', async () => {
      const app = express();
      const cors = (await import('cors')).default;
      app.use(cors({
        origin: ['http://localhost:5174'],
        credentials: true,
      }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:5174');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5174');
    });

    it('白名单外域名应被拒绝', async () => {
      const app = express();
      const cors = (await import('cors')).default;
      app.use(cors({
        origin: ['http://localhost:5174'],
        credentials: true,
      }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app)
        .get('/test')
        .set('Origin', 'http://evil.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});

describe('HRMS — 文件上传安全', () => {
    it('multer fileFilter 应拒绝非白名单文件类型', async () => {
      const multer = (await import('multer')).default;

      const upload = multer({
        storage: multer.memoryStorage(),
        fileFilter: (req, file, cb) => {
          const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
          if (allowed.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
          }
        },
      });

      const app = express();
      app.post('/upload', upload.single('file'), (req, res) => {
        if (!req.file) return res.status(400).json({ error: '文件类型不支持' });
        res.json({ success: true });
      });
      // 添加错误处理中间件
      app.use((err, req, res, next) => {
        res.status(400).json({ error: err.message });
      });

      // 测试拒绝的文件类型 — 错误会被全局错误处理捕获
      const res = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('test'), { filename: 'malware.exe', contentType: 'application/x-msdownload' });

      // multer 错误默认抛 500，但我们的错误处理器返回 400
      expect(res.status).toBe(400);
    });
});
