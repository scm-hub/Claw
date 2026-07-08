import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import systemRoutes from './routes/systems.js';
import accessRoutes from './routes/access.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import employeeRoutes from './routes/employees.js';
import logRoutes from './routes/logs.js';
import { operationLogger } from './middleware/operationLogger.js';
import prisma from './prisma.js';

dotenv.config();

const app = express();

// 信任代理（Vite dev proxy / nginx），使 req.ip 正确解析 x-forwarded-for
app.set('trust proxy', true);

// 中间件
// 安全 HTTP 头
app.use(helmet());

// 全局限流（登录等敏感接口在路由层进一步限制）
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
    process.env.PORTAL_CLIENT_URL || 'http://localhost:5174',
    'http://localhost:5173',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5118',
    'http://192.168.21.34:5174',
    'http://192.168.21.34:5173',
    'http://192.168.21.34:5175',
    'http://192.168.21.34:5176',
    'http://192.168.21.34:5118',
    // 外网访问
    'http://111.17.201.197:5174',
  ],
  credentials: true,
}));
app.use(express.json());

// 操作日志中间件 — 放在路由之前，通过 res.on('finish') 在响应完成后记录
app.use(operationLogger());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sso-auth-center',
    name: '杭州鲜当家统一平台 SSO 认证中心',
    version: '1.1.0',
  });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/systems', systemRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/logs', logRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `路由不存在: ${req.method} ${req.path}` });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[SSO ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
  });
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  杭州鲜当家全品类食用菌综合管理平台');
  console.log('  SSO 认证中心已启动');
  console.log('========================================');
  console.log(`  API: http://localhost:${PORT}`);
  console.log(`  HRMS: ${process.env.HRMS_API_URL || 'http://localhost:4002'}`);
  console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================\n');
});

// 优雅关闭
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
