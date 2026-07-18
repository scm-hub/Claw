import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';

const router = Router();
router.use(authenticate);

// ============================================================
// 工具函数
// ============================================================
function genNo(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${ymd}${rand}`;
}

// ============================================================
// 应收账款
// ============================================================

// 列表
router.get('/receivable', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', customerId = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (keyword) where.arNo = { contains: keyword };

    const [list, total] = await Promise.all([
      prisma.accountsReceivable.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, contactPhone: true } },
          invoice: { select: { id: true, invoiceNo: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.accountsReceivable.count({ where }),
    ]);

    // 统计汇总
    const summary = await prisma.accountsReceivable.aggregate({
      _sum: { amount: true, receivedAmount: true, balance: true },
      where,
    });

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize), summary: summary._sum },
    });
  } catch (err) { next(err); }
});

// 详情
router.get('/receivable/:id', async (req, res, next) => {
  try {
    const ar = await prisma.accountsReceivable.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        invoice: true,
        afterSales: true,
      },
    });
    if (!ar) return res.status(404).json({ success: false, message: '应收账款不存在' });
    res.json({ success: true, data: ar });
  } catch (err) { next(err); }
});

// 手动创建应收
router.post('/receivable', authorize(ROLES.FINANCE_STAFF, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { customerId, refType, refId, amount, dueDate, remark } = req.body;
    const ar = await prisma.accountsReceivable.create({
      data: {
        arNo: genNo('AR'),
        customerId,
        refType: refType || 'MANUAL',
        refId: refId || null,
        amount: Number(amount),
        receivedAmount: 0,
        balance: Number(amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PENDING',
      },
    });
    res.json({ success: true, data: ar, message: '应收账款创建成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 应付账款
// ============================================================

// 列表
router.get('/payable', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', supplierId = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (keyword) where.apNo = { contains: keyword };

    const [list, total] = await Promise.all([
      prisma.accountsPayable.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, contactPhone: true } },
          invoice: { select: { id: true, invoiceNo: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.accountsPayable.count({ where }),
    ]);

    const summary = await prisma.accountsPayable.aggregate({
      _sum: { amount: true, paidAmount: true, balance: true },
      where,
    });

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize), summary: summary._sum },
    });
  } catch (err) { next(err); }
});

// 详情
router.get('/payable/:id', async (req, res, next) => {
  try {
    const ap = await prisma.accountsPayable.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, invoice: true },
    });
    if (!ap) return res.status(404).json({ success: false, message: '应付账款不存在' });
    res.json({ success: true, data: ap });
  } catch (err) { next(err); }
});

// 手动创建应付
router.post('/payable', authorize(ROLES.FINANCE_STAFF, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { supplierId, refType, refId, amount, dueDate } = req.body;
    const ap = await prisma.accountsPayable.create({
      data: {
        apNo: genNo('AP'),
        supplierId,
        refType: refType || 'MANUAL',
        refId: refId || null,
        amount: Number(amount),
        paidAmount: 0,
        balance: Number(amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PENDING',
      },
    });
    res.json({ success: true, data: ap, message: '应付账款创建成功' });
  } catch (err) { next(err); }
});

// 提交应付账款 → SUBMITTED 已提交待付款
router.put('/payable/:id/submit', authorize(ROLES.FINANCE_STAFF, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const ap = await prisma.accountsPayable.findUnique({ where: { id: req.params.id } });
    if (!ap) return res.status(404).json({ success: false, message: '应付账款不存在' });
    if (ap.status !== 'PENDING') return res.status(400).json({ success: false, message: `当前状态为「${ap.status}」，仅待付款状态可提交` });

    const updated = await prisma.accountsPayable.update({
      where: { id: req.params.id },
      data: { status: 'SUBMITTED' },
    });
    res.json({ success: true, data: updated, message: '已提交待付款' });
  } catch (err) { next(err); }
});

// 采购入库时自动创建应付 — 内部调用接口
router.post('/payable/auto', async (req, res, next) => {
  try {
    const { supplierId, refType, refId, amount } = req.body;
    const ap = await prisma.accountsPayable.create({
      data: {
        apNo: genNo('AP'),
        supplierId,
        refType,
        refId,
        amount: Number(amount),
        paidAmount: 0,
        balance: Number(amount),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });
    res.json({ success: true, data: ap });
  } catch (err) { next(err); }
});

// ============================================================
// 发票管理
// ============================================================

// 列表
router.get('/invoices', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', invoiceType = '', direction = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (invoiceType) where.invoiceType = invoiceType;
    if (direction) where.direction = direction;
    if (keyword) where.invoiceNo = { contains: keyword };

    const [list, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          accountsReceivable: { include: { customer: { select: { id: true, name: true } } } },
          accountsPayable: { include: { supplier: { select: { id: true, name: true } } } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 创建发票
router.post('/invoices', authorize(ROLES.FINANCE_STAFF, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { invoiceNo, invoiceType, direction, partyId, partyType, amount, taxAmount, invoiceDate, relatedArId, relatedApId } = req.body;
    const grandTotal = Number(amount) + Number(taxAmount || 0);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: invoiceNo || genNo('INV'),
        invoiceType,
        direction, // SALES(销项) / PURCHASE(进项)
        partyId,
        partyType, // CUSTOMER / SUPPLIER
        amount: Number(amount),
        taxAmount: Number(taxAmount) || 0,
        grandTotal,
        invoiceDate: new Date(invoiceDate),
        relatedArId: relatedArId || null,
        relatedApId: relatedApId || null,
        status: 'ISSUED',
      },
    });

    // 关联到AR
    if (relatedArId) {
      await prisma.accountsReceivable.update({
        where: { id: relatedArId },
        data: { invoiceId: invoice.id },
      });
    }
    // 关联到AP
    if (relatedApId) {
      await prisma.accountsPayable.update({
        where: { id: relatedApId },
        data: { invoiceId: invoice.id },
      });
    }

    res.json({ success: true, data: invoice, message: '发票创建成功' });
  } catch (err) { next(err); }
});

// 作废发票
router.put('/invoices/:id/cancel', authorize(ROLES.FINANCE_STAFF, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ success: true, data: invoice, message: '发票已作废' });
  } catch (err) { next(err); }
});

// ============================================================
// 收付款记录
// ============================================================

// 列表
router.get('/payments', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', paymentType = '', status = '' } = req.query;
    const where = {};
    if (paymentType) where.paymentType = paymentType;
    if (status) where.status = status;
    if (keyword) where.paymentNo = { contains: keyword };

    const [list, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          operator: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);

    // 补充客户/供应商名称
    const enriched = await Promise.all(list.map(async (p) => {
      let partyName = '';
      if (p.partyType === 'CUSTOMER') {
        const c = await prisma.customer.findUnique({ where: { id: p.partyId }, select: { name: true } });
        partyName = c?.name || '';
      } else if (p.partyType === 'SUPPLIER') {
        const s = await prisma.supplier.findUnique({ where: { id: p.partyId }, select: { name: true } });
        partyName = s?.name || '';
      }
      return { ...p, partyName };
    }));

    res.json({ success: true, data: { list: enriched, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 创建收付款（自动核销AR/AP）
router.post('/payments', authorize(ROLES.FINANCE_STAFF, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { paymentType, partyId, partyType, amount, paymentMethod, bankAccount, refArId, refApId, paymentDate, remark } = req.body;
    const amt = Number(amount);

    const payment = await prisma.payment.create({
      data: {
        paymentNo: genNo('PAY'),
        paymentType, // RECEIPT(收款) / PAYMENT(付款)
        partyId,
        partyType, // CUSTOMER / SUPPLIER
        amount: amt,
        paymentMethod: paymentMethod || null,
        bankAccount: bankAccount || null,
        refArId: refArId || null,
        refApId: refApId || null,
        paymentDate: new Date(paymentDate),
        status: 'CONFIRMED',
        operatorId: req.user.employeeId,
        remark: remark || null,
      },
    });

    // 自动核销应收
    if (refArId) {
      const ar = await prisma.accountsReceivable.findUnique({ where: { id: refArId } });
      if (ar) {
        const newReceived = Number(ar.receivedAmount) + amt;
        const newBalance = Number(ar.amount) - newReceived;
        await prisma.accountsReceivable.update({
          where: { id: refArId },
          data: {
            receivedAmount: newReceived,
            balance: newBalance,
            status: newBalance <= 0 ? 'SETTLED' : 'PARTIAL',
          },
        });
      }
    }

    // 自动核销应付
    if (refApId) {
      const ap = await prisma.accountsPayable.findUnique({ where: { id: refApId } });
      if (ap) {
        const newPaid = Number(ap.paidAmount) + amt;
        const newBalance = Number(ap.amount) - newPaid;
        await prisma.accountsPayable.update({
          where: { id: refApId },
          data: {
            paidAmount: newPaid,
            balance: newBalance,
            status: newBalance <= 0 ? 'SETTLED' : 'PARTIAL',
          },
        });
      }
    }

    res.json({ success: true, data: payment, message: '收付款记录创建成功，已自动核销' });
  } catch (err) { next(err); }
});

// 统计看板
router.get('/dashboard', async (req, res, next) => {
  try {
    const [arSummary, apSummary, invoiceCount, paymentSummary] = await Promise.all([
      prisma.accountsReceivable.aggregate({
        _sum: { amount: true, receivedAmount: true, balance: true },
        _count: true,
      }),
      prisma.accountsPayable.aggregate({
        _sum: { amount: true, paidAmount: true, balance: true },
        _count: true,
      }),
      prisma.invoice.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        ar: { ...arSummary._sum, count: arSummary._count },
        ap: { ...apSummary._sum, count: apSummary._count },
        invoiceCount,
        payment: { ...paymentSummary._sum, count: paymentSummary._count },
      },
    });
  } catch (err) { next(err); }
});

export default router;
