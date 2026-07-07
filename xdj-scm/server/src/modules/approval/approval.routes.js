import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';

const router = Router();
router.use(authenticate);

// 审批列表
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status = '', flowType = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (flowType) where.flowType = flowType;
    const [list, total] = await Promise.all([
      prisma.approvalFlow.findMany({
        where,
        include: {
          applicant: { select: { id: true, name: true, empNo: true } },
          approver: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.approvalFlow.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 待我审批
router.get('/pending', async (req, res, next) => {
  try {
    const list = await prisma.approvalFlow.findMany({
      where: { status: 'PENDING' },
      include: {
        applicant: { select: { id: true, name: true, empNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

// 创建审批流
router.post('/', async (req, res, next) => {
  try {
    const { flowType, refId, remark } = req.body;
    if (!flowType || !refId) return res.status(400).json({ success: false, message: '审批类型和关联ID必填' });
    const flow = await prisma.approvalFlow.create({
      data: {
        flowType,
        refId,
        applicantId: req.user.employeeId,
        remark: remark || null,
        status: 'PENDING',
      },
    });
    res.json({ success: true, data: flow });
  } catch (err) { next(err); }
});

// 审批操作
router.put('/:id/process', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER, ROLES.SALES_MANAGER, ROLES.FINANCE_MANAGER), async (req, res, next) => {
  try {
    const { approved, remark } = req.body;
    const flow = await prisma.approvalFlow.findUnique({ where: { id: req.params.id } });
    if (!flow) return res.status(404).json({ success: false, message: '审批流不存在' });
    if (flow.status !== 'PENDING') return res.status(400).json({ success: false, message: '当前状态不可审批' });

    const updated = await prisma.approvalFlow.update({
      where: { id: req.params.id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        approverId: req.user.employeeId,
        remark: remark || null,
        completedAt: new Date(),
      },
      include: {
        applicant: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;
