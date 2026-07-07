// 金蝶云星空 & 各子系统 API 配置
// workflow-engine 作为 Portal 下的子服务，主要对接 SCM / HRMS 的回调

export const SYSTEMS = {
  scm: {
    name: '供应链管理系统',
    apiUrl: 'http://localhost:4003',
    callbackPath: '/api/workflow/callback',
  },
  hrms: {
    name: '人事管理系统',
    apiUrl: 'http://localhost:4002',
    callbackPath: '/api/workflow/callback',
  },
  mdm: {
    name: '主数据管理系统',
    apiUrl: 'http://localhost:4005',
    callbackPath: '/api/workflow/callback',
  },
  portal: {
    name: '综合管理平台',
    apiUrl: 'http://localhost:4001',
    callbackPath: '/api/workflow/callback',
  },
};

// 子系统 → 模块映射（级联选择数据源）
export const SYSTEM_MODULES = {
  scm: [
    { code: 'purchase', name: '采购管理' },
    { code: 'sales', name: '销售管理' },
    { code: 'warehouse', name: '仓库管理' },
    { code: 'finance', name: '财务管理' },
    { code: 'logistics', name: '物流管理' },
    { code: 'quality', name: '质量管理' },
    { code: 'contract', name: '合同管理' },
    { code: 'aftersales', name: '售后服务' },
  ],
  hrms: [
    { code: 'employee', name: '员工管理' },
    { code: 'attendance', name: '考勤管理' },
    { code: 'salary', name: '薪资管理' },
    { code: 'recruitment', name: '招聘管理' },
    { code: 'training', name: '培训管理' },
    { code: 'performance', name: '绩效管理' },
  ],
  mdm: [
    { code: 'department', name: '部门管理' },
    { code: 'employee-sync', name: '人员同步' },
    { code: 'material', name: '物料管理' },
    { code: 'customer', name: '客户管理' },
    { code: 'supplier', name: '供应商管理' },
  ],
  portal: [
    { code: 'access', name: '权限管理' },
    { code: 'workflow', name: '审批工作台' },
    { code: 'logs', name: '操作日志' },
  ],
};

// 业务类型 → 默认所属系统 + 模块
export const BUSINESS_TYPE_SYSTEM = {
  purchase_order: { system: 'scm', module: 'purchase' },
  purchase_return: { system: 'scm', module: 'purchase' },
  purchase_plan: { system: 'scm', module: 'purchase' },
  sales_order: { system: 'scm', module: 'sales' },
  sales_return: { system: 'scm', module: 'sales' },
  sales_plan: { system: 'scm', module: 'sales' },
  sales_delivery: { system: 'scm', module: 'sales' },
  sales_settlement: { system: 'scm', module: 'sales' },
  inbound_order: { system: 'scm', module: 'warehouse' },
  outbound_order: { system: 'scm', module: 'warehouse' },
  transfer_order: { system: 'scm', module: 'warehouse' },
  payment_request: { system: 'scm', module: 'finance' },
  receipt_request: { system: 'scm', module: 'finance' },
  delivery_order: { system: 'scm', module: 'logistics' },
  quality_check: { system: 'scm', module: 'quality' },
  contract: { system: 'scm', module: 'contract' },
  aftersales_request: { system: 'scm', module: 'aftersales' },
  entry: { system: 'hrms', module: 'employee' },
  exit: { system: 'hrms', module: 'employee' },
  transfer: { system: 'hrms', module: 'employee' },
  leave_request: { system: 'hrms', module: 'attendance' },
  overtime_request: { system: 'hrms', module: 'attendance' },
  salary_adjustment: { system: 'hrms', module: 'salary' },
  recruitment_request: { system: 'hrms', module: 'recruitment' },
  training_request: { system: 'hrms', module: 'training' },
  performance_review: { system: 'hrms', module: 'performance' },
  department_change: { system: 'mdm', module: 'department' },
  employee_sync: { system: 'mdm', module: 'employee-sync' },
  material_change: { system: 'mdm', module: 'material' },
  customer_change: { system: 'mdm', module: 'customer' },
  supplier_change: { system: 'mdm', module: 'supplier' },
  access_change: { system: 'portal', module: 'access' },
};

// 模块 → 业务类型映射（级联第三级数据源）
export const MODULE_BUSINESS_TYPES = {
  purchase: [
    { code: 'purchase_order', name: '采购订单审批' },
    { code: 'purchase_return', name: '采购退货审批' },
    { code: 'purchase_plan', name: '采购计划审批' },
  ],
  sales: [
    { code: 'sales_order', name: '销售订单审批' },
    { code: 'sales_return', name: '销售退货审批' },
    { code: 'sales_plan', name: '销售计划审批' },
    { code: 'sales_delivery', name: '销售发货审批' },
    { code: 'sales_settlement', name: '销售结算审批' },
  ],
  warehouse: [
    { code: 'inbound_order', name: '入库审批' },
    { code: 'outbound_order', name: '出库审批' },
    { code: 'transfer_order', name: '调拨审批' },
  ],
  finance: [
    { code: 'payment_request', name: '付款审批' },
    { code: 'receipt_request', name: '收款审批' },
  ],
  logistics: [
    { code: 'delivery_order', name: '发货审批' },
  ],
  quality: [
    { code: 'quality_check', name: '质检审批' },
  ],
  contract: [
    { code: 'contract', name: '合同审批' },
  ],
  aftersales: [
    { code: 'aftersales_request', name: '售后审批' },
  ],
  employee: [
    { code: 'entry', name: '入职审批' },
    { code: 'exit', name: '离职审批' },
    { code: 'transfer', name: '调岗审批' },
  ],
  attendance: [
    { code: 'leave_request', name: '请假审批' },
    { code: 'overtime_request', name: '加班审批' },
  ],
  salary: [
    { code: 'salary_adjustment', name: '薪资调整审批' },
  ],
  recruitment: [
    { code: 'recruitment_request', name: '招聘审批' },
  ],
  training: [
    { code: 'training_request', name: '培训审批' },
  ],
  performance: [
    { code: 'performance_review', name: '绩效审批' },
  ],
  department: [
    { code: 'department_change', name: '部门变更审批' },
  ],
  'employee-sync': [
    { code: 'employee_sync', name: '人员同步审批' },
  ],
  material: [
    { code: 'material_change', name: '物料变更审批' },
  ],
  customer: [
    { code: 'customer_change', name: '客户变更审批' },
  ],
  supplier: [
    { code: 'supplier_change', name: '供应商变更审批' },
  ],
  access: [
    { code: 'access_change', name: '权限变更审批' },
  ],
};

// 审批节点类型
export const NODE_TYPES = {
  person: '固定人员审批',
  role: '角色审批',
  dept_manager: '部门主管审批',
  countersign: '会签（全部通过）',
  any_sign: '或签（一人通过）',
  condition: '条件分支',
};

// 流程实例状态
export const INSTANCE_STATUS = {
  pending: '审批进行中',
  approved: '审批通过',
  rejected: '审批拒绝',
  cancelled: '已撤销',
  withdrawn: '已撤回',
};

// 任务状态
export const TASK_STATUS = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  delegated: '已转审',
  forwarded: '已加签',
};

// 任务动作
export const TASK_ACTIONS = {
  pass: '通过',
  reject: '拒绝',
  delegate: '转审',
  comment: '加签意见',
};
