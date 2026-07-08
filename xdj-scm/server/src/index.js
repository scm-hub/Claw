import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// 信任代理（Vite dev proxy），使 req.ip 正确解析 x-forwarded-for
app.set('trust proxy', true);

// WebSocket
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log('[WS] client connected:', socket.id);
  socket.on('join', (room) => socket.join(room));
  socket.on('disconnect', () => console.log('[WS] disconnected:', socket.id));
});

// 全局 WebSocket 实例（供其他模块推送实时数据）
app.set('io', io);

// 中间件
// 安全 HTTP 头（SCM 有文件上传，放宽 CSP）
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }),
);

// 全局限流（SCM 业务量大，放宽限制）
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
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
      'http://localhost:5175',
      'http://localhost:5176',
      'http://192.168.21.34:5174',
      'http://192.168.21.34:5175',
      'http://192.168.21.34:5176',
      'http://111.17.201.197:5174',
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 操作日志上报 — 将写操作日志异步上报到 Portal 统一日志中心
import { portalLogReporter } from './middleware/portalLogReporter.js';
app.use(portalLogReporter());

// 静态文件（上传的附件等）
app.use('/uploads', express.static('uploads'));

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'xdj-scm' }));

// API 路由
app.use('/api/auth', (await import('./modules/auth/auth.routes.js')).default);
app.use('/api/master', (await import('./modules/master/master.routes.js')).default);
app.use('/api/purchase', (await import('./modules/purchase/purchase.routes.js')).default);
app.use('/api/wms', (await import('./modules/wms/wms.routes.js')).default);
app.use('/api/traceability', (await import('./modules/traceability/traceability.routes.js')).default);
app.use('/api/sales', (await import('./modules/sales/sales.routes.js')).default);
app.use('/api/finance', (await import('./modules/finance/finance.routes.js')).default);
app.use('/api/cost', (await import('./modules/cost/cost.routes.js')).default);
app.use('/api/logistics', (await import('./modules/logistics/logistics.routes.js')).default);
app.use('/api/logistics', (await import('./modules/logistics/merge-suggestions.routes.js')).default);
app.use('/api/coldchain', (await import('./modules/coldchain/coldchain.routes.js')).default);
app.use('/api/barcode', (await import('./modules/barcode/barcode.routes.js')).default);
app.use('/api/contract', (await import('./modules/contract/contract.routes.js')).default);
app.use('/api/aftersales', (await import('./modules/aftersales/aftersales.routes.js')).default);
app.use('/api/approval', (await import('./modules/approval/approval.routes.js')).default);
app.use('/api/extra', (await import('./modules/extra/extra.routes.js')).default);
app.use('/api/workflow', (await import('./modules/workflow/workflow.routes.js')).default);
app.use('/api/address', (await import('./modules/address/address.routes.js')).default);
app.use('/api/mobile-layout', (await import('./modules/extra/mobile-layout.routes.js')).default);

// 启动成本价定时计算任务（每天 0:00 和 12:00）
import { startCostPriceScheduler } from './modules/cost-price.scheduler.js';
startCostPriceScheduler();

// 启动采购计划智能建议定时任务（每天 06:00 自动生成并分配）
import { startPurchasePlanScheduler } from './modules/purchase-plan.scheduler.js';
startPurchasePlanScheduler();

// 启动安全库存水位快照定时任务（每天 02:00）
import { startStockLevelScheduler } from './modules/stock-level.scheduler.js';
startStockLevelScheduler();

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

const PORT = process.env.PORT || 4003;

httpServer.listen(PORT, () => {
  console.log(`\n[XX-SCM] 鲜当家供应链管理系统后端已启动`);
  console.log(`  API: http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`  环境: ${process.env.NODE_ENV || 'development'}\n`);
});
