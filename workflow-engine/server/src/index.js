import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import workflowRoutes from './routes/workflow.js';
import prisma from './prisma.js';

dotenv.config();

const app = express();

// 信任代理
app.set('trust proxy', true);

// 中间件
// 安全 HTTP 头
app.use(helmet());

// 全局限流
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
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
      'http://localhost:4011',
      'http://192.168.21.34:5174',
      'http://192.168.21.34:5173',
      'http://111.17.201.197:5174',
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'workflow-engine',
    name: '鲜当家统一审批流引擎',
    version: '1.0.0',
  });
});

// API 路由
app.use('/api/workflow', workflowRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `路由不存在: ${req.method} ${req.path}` });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[Workflow ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
  });
});

const PORT = process.env.PORT || 4011;

app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  鲜当家统一审批流引擎');
  console.log('  Workflow Engine 已启动');
  console.log('========================================');
  console.log(`  API: http://localhost:${PORT}`);
  console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================\n');
});

// 优雅关闭
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
