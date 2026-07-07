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

// 合同列表
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', contractType = '', status = '', partyType = '' } = req.query;
    const where = {};
    if (keyword) where.OR = [{ contractNo: { contains: keyword } }, { title: { contains: keyword } }];
    if (contractType) where.contractType = contractType;
    if (status) where.status = status;
    if (partyType) where.partyType = partyType;
    const [list, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          logistics: { select: { id: true, name: true } },
          _count: { select: { purchaseOrders: true, salesOrders: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contract.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 合同详情
router.get('/:id', async (req, res, next) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, name: true } },
        supplier: true,
        logistics: true,
        purchaseOrders: { select: { id: true, orderNo: true, status: true, grandTotal: true } },
        salesOrders: { select: { id: true, orderNo: true, status: true, grandTotal: true } },
      },
    });
    if (!contract) return res.status(404).json({ success: false, message: '合同不存在' });
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
});

// 创建合同
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER, ROLES.SALES_MANAGER), async (req, res, next) => {
  try {
    const { title, contractType, partyType, partyId, supplierId, logisticsId, signDate, effectiveFrom, effectiveTo, amount, attachmentUrl, relatedPoId, relatedSoId } = req.body;
    if (!title || !contractType) return res.status(400).json({ success: false, message: '合同标题和类型必填' });
    const contractNo = genNo('CT');
    const contract = await prisma.contract.create({
      data: {
        contractNo,
        title,
        contractType,
        partyType: partyType || 'SUPPLIER',
        partyId: partyId || supplierId || logisticsId || '',
        supplierId: supplierId || null,
        logisticsId: logisticsId || null,
        signDate: signDate ? new Date(signDate) : new Date(),
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        amount: amount || 0,
        attachmentUrl: attachmentUrl || null,
        relatedPoId: relatedPoId || null,
        relatedSoId: relatedSoId || null,
        creatorId: req.user.employeeId || null,
        status: 'ACTIVE',
      },
    });
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
});

// 更新合同
router.put('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER, ROLES.SALES_MANAGER), async (req, res, next) => {
  try {
    const { title, effectiveTo, amount, attachmentUrl, status } = req.body;
    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data: { title, effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined, amount, attachmentUrl, status },
    });
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
});

// 删除合同
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    await prisma.contract.update({ where: { id: req.params.id }, data: { status: 'TERMINATED' } });
    res.json({ success: true, message: '已终止' });
  } catch (err) { next(err); }
});

export default router;
