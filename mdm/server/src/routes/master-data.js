import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

/**
 * GET /api/master-data/departments — 部门主数据列表
 */
router.get('/departments', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where.name = { contains: search };
    }
    const departments = await prisma.masterDepartment.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: departments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/master-data/employees — 员工主数据列表
 */
router.get('/employees', authenticate, async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { employeeNo: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const employees = await prisma.masterEmployee.findMany({
      where,
      orderBy: { employeeNo: 'asc' },
    });
    res.json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/master-data/mappings — 数据映射列表
 */
router.get('/mappings', authenticate, async (req, res) => {
  try {
    const { systemCode, entityType, syncStatus } = req.query;
    const where = {};
    if (systemCode) where.systemCode = systemCode;
    if (entityType) where.entityType = entityType;
    if (syncStatus) where.syncStatus = syncStatus;

    const mappings = await prisma.dataMapping.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: mappings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
