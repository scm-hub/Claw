import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// 中间件
app.use(cors({ origin: true, credentials: true }));
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
