import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

/**
 * GET /api/dashboard — 概览统计
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const [deptCount, empCount, scmDeptMappings, scmEmpMappings, pendingSyncs, recentLogs] = await Promise.all([
      prisma.masterDepartment.count(),
      prisma.masterEmployee.count(),
      prisma.dataMapping.count({ where: { systemCode: 'SCM', entityType: 'DEPARTMENT', syncStatus: 'SYNCED' } }),
      prisma.dataMapping.count({ where: { systemCode: 'SCM', entityType: 'EMPLOYEE', syncStatus: 'SYNCED' } }),
      prisma.dataMapping.count({ where: { syncStatus: { in: ['PENDING', 'FAILED'] } } }),
      prisma.syncLog.findMany({ take: 5, orderBy: { startedAt: 'desc' } }),
    ]);

    const failedSyncs = await prisma.dataMapping.count({ where: { syncStatus: 'FAILED' } });

    res.json({
      success: true,
      data: {
        masterData: {
          departments: deptCount,
          employees: empCount,
        },
        scmSync: {
          deptMappings: scmDeptMappings,
          empMappings: scmEmpMappings,
          pending: pendingSyncs,
          failed: failedSyncs,
        },
        recentLogs,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
