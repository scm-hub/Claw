import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// 中间件
// 安全 HTTP 头
app.use(helmet());

// 全局限流（AI 接口调用较慢，限制更严格）
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '请求过于频繁，请稍后再试' },
  }),
);

app.use(
  cors({
    origin: [
      'http://localhost:5174',
      'http://localhost:5173',
      'http://192.168.21.34:5174',
      'http://111.17.201.197:5174',
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ai-service' }));

// API 路由
app.use('/api/auth', (await import('./routes/auth.js')).default);
app.use('/api/chat', (await import('./routes/chat.js')).default);
app.use('/api/order-assistant', (await import('./routes/order-assistant.js')).default);
app.use('/api/analytics', (await import('./routes/analytics.js')).default);
app.use('/api/prediction', (await import('./routes/prediction.js')).default);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `路由不存在: ${req.method} ${req.path}` });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
  });
});

const PORT = process.env.PORT || 4004;

app.listen(PORT, () => {
  console.log(`\n[AI-SERVICE] AI 智能服务层已启动`);
  console.log(`  API: http://localhost:${PORT}`);
  console.log(`  环境: ${process.env.NODE_ENV || 'development'}\n`);
});
