import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// 各子系统的模块定义（三级树状结构：第一层=子系统，第二层=模块，第三层=功能点）
const SYSTEM_MODULES = {
  portal: [
    { code: 'dashboard', label: '工作台' },
    { code: 'systems', label: '系统管理' },
    { code: 'access', label: '权限管理', children: [
      { code: 'access-users', label: '用户管理' },
      { code: 'access-roles', label: '角色管理' },
    ]},
    { code: 'workflow', label: '审批管理', children: [
      { code: 'workflow-pending', label: '待我审批' },
      { code: 'workflow-my-flows', label: '我发起的' },
      { code: 'workflow-done', label: '已处理的' },
      { code: 'workflow-templates', label: '流程模板管理' },
    ]},
    { code: 'logs', label: '操作日志' },
  ],
  scm: [
    { code: 'master', label: '基础数据', children: [
      { code: 'master-materials', label: '产品管理' },
      { code: 'master-customers', label: '客户管理' },
      { code: 'master-suppliers', label: '供应商管理' },
      { code: 'master-warehouses', label: '仓库管理' },
      { code: 'master-employees', label: '员工管理' },
      { code: 'master-departments', label: '部门管理' },
      { code: 'master-purchaser-assignments', label: '采购员管理' },
      { code: 'master-providers', label: '承运商管理' },
      { code: 'master-print-templates', label: '打印管理' },
    ]},
    { code: 'purchase', label: '采购管理', children: [
      { code: 'purchase-plans', label: '采购计划' },
      { code: 'purchase-orders', label: '采购订单' },
      { code: 'purchase-receipts', label: '入库管理' },
    ]},
    { code: 'sales', label: '销售管理', children: [
      { code: 'sales-plans', label: '销售计划' },
      { code: 'sales-orders', label: '销售订单' },
      { code: 'sales-prices', label: '费用登记' },
      { code: 'sales-credit', label: '客户信用' },
      { code: 'sales-demand', label: '需求汇总' },
    ]},
    { code: 'warehouse', label: '仓储WMS', children: [
      { code: 'wh-inventory', label: '库存台账' },
      { code: 'wh-zones', label: '库区库位' },
      { code: 'wh-movements', label: '出入库记录' },
      { code: 'wh-stocktakes', label: '盘点管理' },
    ]},
    { code: 'traceability', label: '批次追溯', children: [
      { code: 'trace-batches', label: '批次管理' },
      { code: 'trace-trace', label: '批次追溯' },
      { code: 'trace-stockage', label: '库龄分析' },
      { code: 'trace-recall', label: '召回管理' },
    ]},
    { code: 'finance', label: '财务结算', children: [
      { code: 'fin-receivable', label: '应收账款' },
      { code: 'fin-payable', label: '应付账款' },
      { code: 'fin-invoices', label: '发票管理' },
      { code: 'fin-payments', label: '收付款' },
    ]},
    { code: 'cost', label: '成本引擎', children: [
      { code: 'cost-config', label: '成本配置' },
      { code: 'cost-standard', label: '标准成本' },
    ]},
    { code: 'logistics', label: '物流冷链', children: [
      { code: 'log-shipping', label: '发货管理' },
      { code: 'log-waybills', label: '运单管理' },
      { code: 'log-routes', label: '配送路线' },
      { code: 'log-temp', label: '温度看板' },
      { code: 'log-sensors', label: '传感器管理' },
    ]},
    { code: 'other', label: '其他管理', children: [
      { code: 'wh-barcode', label: '扫码作业' },
      { code: 'contract-mgmt', label: '合同管理' },
      { code: 'contract-aftersales', label: '售后管理' },
      { code: 'approval', label: '审批管理' },
      { code: 'dash-analytics', label: '数据分析' },
      { code: 'dash-alert', label: '预警中心' },
      { code: 'purchase-eval', label: '供应商评估' },
    ]},
    { code: 'settings', label: '系统设置', children: [
      { code: 'settings-portal', label: '用户权限管理' },
    ]},
  ],
  hrms: [
    { code: 'dashboard', label: '仪表盘' },
    { code: 'departments', label: '部门管理' },
    { code: 'positions', label: '岗位管理' },
    { code: 'employees', label: '员工管理' },
    { code: 'onboarding', label: '入职管理' },
    { code: 'attendance', label: '考勤管理', children: [
      { code: 'attendance-punch', label: '考勤打卡' },
      { code: 'attendance-records', label: '考勤记录' },
      { code: 'attendance-summary', label: '考勤汇总' },
    ]},
    { code: 'leave', label: '请假管理', children: [
      { code: 'leave-balance', label: '我的请假' },
      { code: 'leave-apply', label: '请假申请' },
      { code: 'leave-approval', label: '请假审批' },
    ]},
    { code: 'payroll', label: '薪资管理', children: [
      { code: 'payroll-manage', label: '工资台账' },
      { code: 'payroll-calc', label: '薪资计算' },
    ]},
    { code: 'contracts', label: '合同管理' },
    { code: 'performance', label: '绩效管理' },
    { code: 'training', label: '培训管理' },
    { code: 'recruitment', label: '招聘管理' },
    { code: 'reports', label: '报表中心' },
    { code: 'settings', label: '系统设置', children: [
      { code: 'settings-users', label: '用户管理' },
      { code: 'settings-roles', label: '角色管理' },
    ]},
  ],
  mdm: [
    { code: 'master-data', label: '主数据管理', children: [
      { code: 'master-data-departments', label: '部门主数据' },
      { code: 'master-data-employees', label: '员工主数据' },
      { code: 'master-data-sync', label: '同步日志' },
    ]},
  ],
};

/**
 * GET /api/roles/modules
 * 获取各子系统的模块定义（供前端渲染树状权限配置界面）
 */
router.get('/modules', authenticate, requireAdmin, (req, res) => {
  res.json({
    success: true,
    data: { systemModules: SYSTEM_MODULES },
  });
});

/**
 * GET /api/roles
 * 获取所有角色列表（含权限配置）
 */
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: { select: { userRoles: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/roles
 * 创建角色（含权限配置）
 * body: { name, description, permissions: [{ systemCode, moduleCode }] }
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '角色名称必填' });

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ success: false, message: '角色名称已存在' });

    const role = await prisma.role.create({
      data: {
        name,
        description: description || '',
        permissions: {
          create: (permissions || []).map((p) => ({
            systemCode: p.systemCode,
            moduleCode: p.moduleCode,
          })),
        },
      },
      include: { permissions: true },
    });

    res.json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/roles/:id
 * 更新角色（含权限配置）
 * body: { name, description, permissions: [{ systemCode, moduleCode }] }
 */
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return res.status(404).json({ success: false, message: '角色不存在' });
    if (role.isSystem) {
      return res.status(403).json({ success: false, message: '系统内置角色不可编辑' });
    }

    // 检查名称冲突
    if (name && name !== role.name) {
      const existing = await prisma.role.findUnique({ where: { name } });
      if (existing) return res.status(400).json({ success: false, message: '角色名称已存在' });
    }

    // 事务: 更新角色基本信息 + 重建权限
    await prisma.$transaction([
      prisma.role.update({
        where: { id },
        data: {
          name: name || undefined,
          description: description ?? undefined,
        },
      }),
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    ]);

    // 重新创建权限
    if (permissions && permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: id,
          systemCode: p.systemCode,
          moduleCode: p.moduleCode,
        })),
      });
    }

    const updated = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true, _count: { select: { userRoles: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/roles/:id
 * 删除角色（系统内置角色不可删除）
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return res.status(404).json({ success: false, message: '角色不存在' });
    if (role.isSystem) return res.status(400).json({ success: false, message: '系统内置角色不可删除' });

    const userCount = await prisma.userRole.count({ where: { roleId: id } });
    if (userCount > 0) {
      return res.status(400).json({ success: false, message: `该角色已分配给 ${userCount} 个用户，请先取消分配` });
    }

    await prisma.role.delete({ where: { id } });
    res.json({ success: true, message: '角色已删除' });
  } catch (err) {
    next(err);
  }
});

export default router;
