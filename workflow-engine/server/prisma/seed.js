// 鲜当家审批流引擎 — 预置流程模板 & 回调配置
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('开始预置流程模板...');

  // 1. 采购订单审批模板
  await prisma.flowTemplate.upsert({
    where: { businessType: 'purchase_order' },
    create: {
      name: '采购订单审批',
      businessType: 'purchase_order',
      system: 'scm',
      module: 'purchase',
      description: '采购员提交 → 采购主管审批 → 完成',
      nodes: JSON.stringify([
        { nodeId: '1', nodeName: '采购主管审批', type: 'role', approverRole: 'PURCHASE_MANAGER', timeout: 24, timeoutAction: 'remind' },
      ]),
      isActive: true,
    },
    update: {
      name: '采购订单审批',
      module: 'purchase',
      nodes: JSON.stringify([
        { nodeId: '1', nodeName: '采购主管审批', type: 'role', approverRole: 'PURCHASE_MANAGER', timeout: 24, timeoutAction: 'remind' },
      ]),
    },
  });

  // 2. 销售订单审批模板
  await prisma.flowTemplate.upsert({
    where: { businessType: 'sales_order' },
    create: {
      name: '销售订单审批',
      businessType: 'sales_order',
      system: 'scm',
      module: 'sales',
      description: '按毛利率多维度审批：≥25% → 部门经理 / 20-25% → 上层领导 / <20% → 总经理',
      nodes: JSON.stringify({
        nodes: [
          { id: '1', name: '毛利率判断', type: 'condition' },
          { id: '2', name: '部门经理审批', type: 'dept_manager' },
          { id: '3', name: '上层领导审批', type: 'person', approverUserId: 'g_emp010', approverName: '王振东', approverEmail: 'EMP010@hrms.internal', timeout: 24, timeoutAction: 'remind' },
          { id: '4', name: '总经理审批', type: 'person', approverUserId: 'g_emp008', approverName: '苏建昌', approverEmail: 'emp008@hrms.internal', timeout: 48, timeoutAction: 'remind' },
        ],
        connections: [
          { from: '1', to: '2', condition: 'marginRate >= 25' },
          { from: '1', to: '3', condition: 'marginRate >= 20' },
          { from: '1', to: '4', condition: 'default' },
          { from: '2', to: 'end', condition: 'default' },
          { from: '3', to: 'end', condition: 'default' },
          { from: '4', to: 'end', condition: 'default' },
        ],
      }),
      isActive: true,
    },
    update: {
      name: '销售订单审批',
      module: 'sales',
      description: '按毛利率多维度审批：≥25% → 部门经理 / 20-25% → 上层领导 / <20% → 总经理',
      nodes: JSON.stringify({
        nodes: [
          { id: '1', name: '毛利率判断', type: 'condition' },
          { id: '2', name: '部门经理审批', type: 'dept_manager' },
          { id: '3', name: '上层领导审批', type: 'person', approverUserId: 'g_emp010', approverName: '王振东', approverEmail: 'EMP010@hrms.internal', timeout: 24, timeoutAction: 'remind' },
          { id: '4', name: '总经理审批', type: 'person', approverUserId: 'g_emp008', approverName: '苏建昌', approverEmail: 'emp008@hrms.internal', timeout: 48, timeoutAction: 'remind' },
        ],
        connections: [
          { from: '1', to: '2', condition: 'marginRate >= 25' },
          { from: '1', to: '3', condition: 'marginRate >= 20' },
          { from: '1', to: '4', condition: 'default' },
          { from: '2', to: 'end', condition: 'default' },
          { from: '3', to: 'end', condition: 'default' },
          { from: '4', to: 'end', condition: 'default' },
        ],
      }),
    },
  });

  // 3. 采购退货审批模板
  await prisma.flowTemplate.upsert({
    where: { businessType: 'purchase_return' },
    create: {
      name: '采购退货审批',
      businessType: 'purchase_return',
      system: 'scm',
      module: 'purchase',
      description: '仓管提交 → 采购主管审批 → 完成',
      nodes: JSON.stringify([
        { nodeId: '1', nodeName: '采购主管审批', type: 'role', approverRole: 'PURCHASE_MANAGER' },
      ]),
      isActive: true,
    },
    update: { module: 'purchase' },
  });

  // 4. 付款申请审批模板
  await prisma.flowTemplate.upsert({
    where: { businessType: 'payment_request' },
    create: {
      name: '付款申请审批',
      businessType: 'payment_request',
      system: 'scm',
      module: 'finance',
      description: '财务提交 → 财务主管审批 → （金额超10万）总经理审批 → 完成',
      nodes: JSON.stringify([
        { nodeId: '1', nodeName: '财务主管审批', type: 'role', approverRole: 'FINANCE_MANAGER' },
        { nodeId: '2', nodeName: '总经理审批', type: 'person', approverUserId: 'SUPER_ADMIN', approverName: '总经理', conditions: { field: 'totalAmount', op: '>', value: 100000 } },
      ]),
      isActive: true,
    },
    update: { module: 'finance' },
  });

  // 5. 入职审批模板
  await prisma.flowTemplate.upsert({
    where: { businessType: 'entry' },
    create: {
      name: '入职审批',
      businessType: 'entry',
      system: 'hrms',
      module: 'employee',
      description: 'HR提交 → 部门主管审批 → HR总监审批 → 完成',
      nodes: JSON.stringify([
        { nodeId: '1', nodeName: '部门主管审批', type: 'dept_manager' },
        { nodeId: '2', nodeName: 'HR总监审批', type: 'role', approverRole: 'HR_ADMIN' },
      ]),
      isActive: true,
    },
    update: { module: 'employee' },
  });

  // 6. 离职审批模板
  await prisma.flowTemplate.upsert({
    where: { businessType: 'exit' },
    create: {
      name: '离职审批',
      businessType: 'exit',
      system: 'hrms',
      module: 'employee',
      description: '员工提交 → 直属主管审批 → HR审批 → 完成',
      nodes: JSON.stringify([
        { nodeId: '1', nodeName: '直属主管审批', type: 'dept_manager' },
        { nodeId: '2', nodeName: 'HR审批', type: 'role', approverRole: 'HR_ADMIN' },
      ]),
      isActive: true,
    },
    update: { module: 'employee' },
  });

  // 7. 调岗申请审批模板
  await prisma.flowTemplate.upsert({
    where: { businessType: 'transfer' },
    create: {
      name: '调岗申请审批',
      businessType: 'transfer',
      system: 'hrms',
      module: 'employee',
      description: '员工申请 → 原部门主管 → 新部门主管 → HR备案 → 完成',
      nodes: JSON.stringify([
        { nodeId: '1', nodeName: '原部门主管审批', type: 'dept_manager' },
        { nodeId: '2', nodeName: '新部门主管审批', type: 'dept_manager' },
        { nodeId: '3', nodeName: 'HR备案', type: 'role', approverRole: 'HR_ADMIN' },
      ]),
      isActive: true,
    },
    update: { module: 'employee' },
  });

  // 8. 合同审批模板
  await prisma.flowTemplate.upsert({
    where: { businessType: 'contract' },
    create: {
      name: '合同审批',
      businessType: 'contract',
      system: 'scm',
      module: 'contract',
      description: '起草人 → 法务审批 → 总经理审批 → 完成',
      nodes: JSON.stringify([
        { nodeId: '1', nodeName: '法务审批', type: 'role', approverRole: 'CONTRACT_MANAGER' },
        { nodeId: '2', nodeName: '总经理审批', type: 'person', approverUserId: 'SUPER_ADMIN', approverName: '总经理' },
      ]),
      isActive: true,
    },
    update: { module: 'contract' },
  });

  // 回调配置
  await prisma.flowCallbackConfig.upsert({
    where: { system: 'scm' },
    create: { system: 'scm', callbackUrl: 'http://localhost:4003/api/workflow/callback', secret: 'xdj-internal-api-secret-2026', isActive: true },
    update: { callbackUrl: 'http://localhost:4003/api/workflow/callback' },
  });

  await prisma.flowCallbackConfig.upsert({
    where: { system: 'hrms' },
    create: { system: 'hrms', callbackUrl: 'http://localhost:4002/api/workflow/callback', secret: 'xdj-internal-api-secret-2026', isActive: true },
    update: { callbackUrl: 'http://localhost:4002/api/workflow/callback' },
  });

  console.log('预置完成！');
  console.log(' - 流程模板: 8个');
  console.log(' - 回调配置: 2个');

  await prisma.$disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  prisma.$disconnect();
  process.exit(1);
});
