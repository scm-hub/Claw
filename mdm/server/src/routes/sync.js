import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { pullAllFromHrms } from '../services/hrms-sync.js';
import { pushAllToScm, pushDepartmentsToScm, pushEmployeesToScm } from '../services/scm-sync.js';

const router = Router();

/**
 * POST /api/sync/pull-hrms — 从 HRMS 拉取主数据
 */
router.post('/pull-hrms', authenticate, async (req, res) => {
  const log = await prisma.syncLog.create({
    data: {
      syncType: 'PULL_FROM_HRMS',
      entityType: 'ALL',
      status: 'RUNNING',
    },
  });

  try {
    const result = await pullAllFromHrms();
    const totalRecords = result.departments.total + result.employees.total;
    const successCount = totalRecords;

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'SUCCESS',
        totalRecords,
        successCount,
        failedCount: 0,
        details: JSON.stringify(result),
        finishedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: result,
      logId: log.id,
    });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        totalRecords: 0,
        successCount: 0,
        failedCount: 1,
        details: err.message,
        finishedAt: new Date(),
      },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sync/push-scm — 推送主数据到 SCM
 */
router.post('/push-scm', authenticate, async (req, res) => {
  const log = await prisma.syncLog.create({
    data: {
      syncType: 'PUSH_TO_SCM',
      entityType: 'ALL',
      status: 'RUNNING',
    },
  });

  try {
    const result = await pushAllToScm();
    const totalRecords = result.departments.total + result.employees.total;
    const successCount = (result.departments.created + result.departments.updated) +
                         (result.employees.created + result.employees.updated);
    const failedCount = result.departments.failed + result.employees.failed;

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: failedCount > 0 ? 'PARTIAL' : 'SUCCESS',
        totalRecords,
        successCount,
        failedCount,
        details: JSON.stringify(result),
        finishedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: result,
      logId: log.id,
    });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        totalRecords: 0,
        successCount: 0,
        failedCount: 1,
        details: err.message,
        finishedAt: new Date(),
      },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sync/full — 完整同步（先拉取 HRMS，再推送 SCM）
 */
router.post('/full', authenticate, async (req, res) => {
  const log = await prisma.syncLog.create({
    data: {
      syncType: 'FULL_SYNC',
      entityType: 'ALL',
      status: 'RUNNING',
    },
  });

  try {
    const pullResult = await pullAllFromHrms();
    const pushResult = await pushAllToScm();

    const totalRecords = pullResult.departments.total + pullResult.employees.total +
                         pushResult.departments.total + pushResult.employees.total;
    const successCount = pullResult.departments.total + pullResult.employees.total +
                         (pushResult.departments.created + pushResult.departments.updated) +
                         (pushResult.employees.created + pushResult.employees.updated);
    const failedCount = pushResult.departments.failed + pushResult.employees.failed;

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: failedCount > 0 ? 'PARTIAL' : 'SUCCESS',
        totalRecords,
        successCount,
        failedCount,
        details: JSON.stringify({ pull: pullResult, push: pushResult }),
        finishedAt: new Date(),
      },
    });

    // 更新同步配置的最后同步时间
    await prisma.syncConfig.updateMany({
      where: { systemCode: 'SCM' },
      data: { lastSyncAt: new Date() },
    });

    res.json({
      success: true,
      data: { pull: pullResult, push: pushResult },
      logId: log.id,
    });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        totalRecords: 0,
        successCount: 0,
        failedCount: 1,
        details: err.message,
        finishedAt: new Date(),
      },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/sync/status — 同步状态概览
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const [scmConfig, lastLog] = await Promise.all([
      prisma.syncConfig.findUnique({ where: { systemCode: 'SCM' } }),
      prisma.syncLog.findFirst({ orderBy: { startedAt: 'desc' } }),
    ]);

    const pendingMappings = await prisma.dataMapping.count({
      where: { syncStatus: 'PENDING' },
    });
    const failedMappings = await prisma.dataMapping.count({
      where: { syncStatus: 'FAILED' },
    });
    const syncedMappings = await prisma.dataMapping.count({
      where: { syncStatus: 'SYNCED' },
    });

    res.json({
      success: true,
      data: {
        scmConfig,
        lastSync: lastLog,
        mappings: { pending: pendingMappings, failed: failedMappings, synced: syncedMappings },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
