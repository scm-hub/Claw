import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leaves.js';
import salaryRoutes from './routes/salary.js';
import payrollRoutes from './routes/payroll.js';
import recruitmentRoutes from './routes/recruitment.js';
import performanceRoutes from './routes/performance.js';
import departmentRoutes from './routes/departments.js';
import positionRoutes from './routes/positions.js';
import roleRoutes from './routes/roles.js';
import dashboardRoutes from './routes/dashboard.js';
import contractRoutes from './routes/contracts.js';
import trainingRoutes from './routes/trainings.js';
import reportRoutes from './routes/reports.js';
import onboardingRoutes from './routes/onboarding.js';
import { errorHandler } from './middleware/errorHandler.js';
import { portalLogReporter } from './middleware/portalLogReporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
export const prisma = new PrismaClient();

// 信任代理（Vite dev proxy），使 req.ip 正确解析 x-forwarded-for
app.set('trust proxy', true);

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
      'http://192.168.21.34:5174',
      'http://111.17.201.197:5174',
    ],
    credentials: true,
  }),
);
app.use(express.json());

// 操作日志上报 — 将写操作日志异步上报到 Portal 统一日志中心
app.use(portalLogReporter());

// Serve uploaded files
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/onboarding', onboardingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'HRMS API is running' });
});

// Serve frontend static files (production build)
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// SPA fallback: all non-API routes serve index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Error handler
app.use(errorHandler);

export default app;
