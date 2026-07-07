import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import masterDataRoutes from './routes/master-data.js';
import syncRoutes from './routes/sync.js';
import syncLogRoutes from './routes/sync-log.js';
import { portalLogReporter } from './middleware/portalLogReporter.js';

const app = express();
const PORT = process.env.PORT || 4005;

// 信任代理（Vite dev proxy），使 req.ip 正确解析 x-forwarded-for
app.set('trust proxy', true);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 操作日志上报 — 将写操作日志异步上报到 Portal 统一日志中心
app.use(portalLogReporter());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mdm-server',
    name: '杭州鲜当家主数据管理系统',
    version: '1.0.0',
  });
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/sync-logs', syncLogRoutes);

// 错误处理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`MDM Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
