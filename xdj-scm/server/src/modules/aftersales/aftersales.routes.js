import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';

const router = Router();
router.use(authenticate);

function genNo(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${ymd}${rand}`;
}

// 售后记录列表
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', type = '' } = req.query;
    const where = {};
    if (keyword) where.recordNo = { contains: keyword };
    if (status) where.status = status;
    if (type) where.type = type;
    const [list, total] = await Promise.all([
      prisma.afterSalesRecord.findMany({
        where,
        include: {
          salesOrder: { select: { id: true, orderNo: true } },
          customer: { select: { id: true, name: true, contactPhone: true } },
          batch: { select: { id: true, batchNo: true } },
          ar: { select: { id: true, arNo: true } },
          applicant: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.afterSalesRecord.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 创建售后记录
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.SALES_STAFF, ROLES.SALES_MANAGER), async (req, res, next) => {
  try {
    const { salesOrderId, customerId, batchId, type, reason, refundAmount, applicantId } = req.body;
    if (!salesOrderId || !customerId || !type) return res.status(400).json({ success: false, message: '销售订单、客户、售后类型必填' });
    const recordNo = genNo('AS');

    // 如果是退款且金额>0，自动创建红冲应收
    let arId = null;
    if (type === 'REFUND' && refundAmount > 0) {
      const arNo = genNo('AR');
      const ar = await prisma.accountsReceivable.create({
        data: {
          arNo,
          customerId,
          refType: 'AFTER_SALES',
          amount: -refundAmount, // 红冲（负数）
          receivedAmount: 0,
          balance: -refundAmount,
          dueDate: new Date(),
          status: 'PENDING',
        },
      });
      arId = ar.id;
    }

    const record = await prisma.afterSalesRecord.create({
      data: {
        recordNo,
        salesOrderId,
        customerId,
        batchId: batchId || null,
        type,
        reason: reason || null,
        refundAmount: refundAmount || 0,
        arId,
        applicantId: applicantId || req.user.employeeId || null,
        status: 'PENDING',
        refundStatus: type === 'REFUND' ? 'PENDING' : 'N/A',
      },
      include: { customer: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
});

// 审批售后
router.put('/:id/approve', authorize(ROLES.SUPER_ADMIN, ROLES.SALES_MANAGER), async (req, res, next) => {
  try {
    const { approved, remark } = req.body;
    const record = await prisma.afterSalesRecord.findUnique({ where: { id: req.params.id } });
    if (!record) return res.status(404).json({ success: false, message: '售后记录不存在' });
    if (record.status !== 'PENDING') return res.status(400).json({ success: false, message: '当前状态不可审批' });

    const newStatus = approved ? 'APPROVED' : 'REJECTED';
    const updated = await prisma.afterSalesRecord.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        refundStatus: approved && record.type === 'REFUND' ? 'PROCESSING' : record.refundStatus,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 完成售后（退款到账）
router.put('/:id/complete', authorize(ROLES.SUPER_ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE_STAFF), async (req, res, next) => {
  try {
    const record = await prisma.afterSalesRecord.findUnique({ where: { id: req.params.id } });
    if (!record) return res.status(404).json({ success: false, message: '售后记录不存在' });
    if (record.status !== 'APPROVED') return res.status(400).json({ success: false, message: '仅已审批的记录可完成' });

    const updated = await prisma.afterSalesRecord.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        refundStatus: record.type === 'REFUND' ? 'COMPLETED' : 'N/A',
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;
