// 角色中文名称映射
const ROLE_NAMES = {
  SUPER_ADMIN: '超级管理员',
  HR_ADMIN: 'HR管理员',
  HR: 'HR专员',
  SALES_MANAGER: '销售经理',
  SALES_REP: '销售代表',
  SALES_STAFF: '销售专员',
  PURCHASE_MANAGER: '采购经理',
  PURCHASE_STAFF: '采购员',
  WAREHOUSE_MANAGER: '仓库经理',
  WAREHOUSE_STAFF: '仓库专员',
  FINANCE_MANAGER: '财务经理',
  FINANCE_STAFF: '财务专员',
  COST_MANAGER: '成本经理',
  QUALITY_STAFF: '质检专员',
  LOGISTICS_STAFF: '物流专员',
  CONTRACT_MANAGER: '合同管理员',
  EMPLOYEE: '普通员工',
};

// 模块权限 → 对应角色的映射
// 如果用户在 Portal 有对应模块权限，即使推导角色不同，也应能操作该模块的功能
// 支持前缀匹配：如 'purchase-plans' 会匹配 'purchase' 前缀
const MODULE_ROLE_MAP = {
  purchase: ['PURCHASE_MANAGER', 'PURCHASE_STAFF'],
  sales: ['SALES_MANAGER', 'SALES_STAFF'],
  warehouse: ['WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'],
  finance: ['FINANCE_MANAGER', 'FINANCE_STAFF'],
  cost: ['COST_MANAGER'],
  logistics: ['LOGISTICS_STAFF'],
  contract: ['CONTRACT_MANAGER'],
  quality: ['QUALITY_STAFF'],
};

// 检查用户的某个模块权限是否匹配 MODULE_ROLE_MAP 中的某个模块（支持前缀匹配）
// 例如：permModule='purchase-plans' 会匹配 'purchase' → 返回对应的角色列表
function getMappedRoles(permModule) {
  // 1. 精确匹配
  if (MODULE_ROLE_MAP[permModule]) {
    return MODULE_ROLE_MAP[permModule];
  }
  // 2. 前缀匹配：如 'purchase-plans' → 找 'purchase' 前缀
  for (const [modulePrefix, roles] of Object.entries(MODULE_ROLE_MAP)) {
    if (permModule === modulePrefix || permModule.startsWith(modulePrefix + '-')) {
      return roles;
    }
  }
  return null;
}

// RBAC 权限校验中间件
// 双重判断：角色匹配 OR 模块权限匹配
// 用法: router.post('/plans', authenticate, authorize('SUPER_ADMIN', 'PURCHASE_STAFF', 'PURCHASE_MANAGER'), handler)

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const userRole = req.user.role;
    const userPermissions = req.user.permissions || [];

    // SUPER_ADMIN 拥有所有权限
    if (userRole === 'SUPER_ADMIN') {
      return next();
    }

    // 1. 角色直接匹配
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // 2. 模块权限匹配：如果用户有某个模块权限，且该模块对应角色在允许列表中，也算通过
    // 例如：角色 FINANCE_MANAGER + 有 purchase-plans 模块权限 → 允许操作 PURCHASE_MANAGER/PURCHASE_STAFF 的功能
    for (const permModule of userPermissions) {
      const mappedRoles = getMappedRoles(permModule);
      if (mappedRoles && mappedRoles.some(r => allowedRoles.includes(r))) {
        return next();
      }
    }

    // 既没有角色匹配，也没有模块权限匹配 → 拒绝
    const roleNames = allowedRoles.map(r => ROLE_NAMES[r] || r);
    return res.status(403).json({
      success: false,
      message: `权限不足，需要角色: ${roleNames.join(' 或 ')}`,
    });
  };
}

// 角色常量（供业务代码引用）
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SALES_MANAGER: 'SALES_MANAGER',
  SALES_REP: 'SALES_REP',
  SALES_STAFF: 'SALES_REP',
  PURCHASE_STAFF: 'PURCHASE_STAFF',
  PURCHASE_MANAGER: 'PURCHASE_MANAGER',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  FINANCE_STAFF: 'FINANCE_STAFF',
  FINANCE_MANAGER: 'FINANCE_STAFF',
  COST_MANAGER: 'COST_MANAGER',
  QUALITY_STAFF: 'QUALITY_STAFF',
  LOGISTICS_STAFF: 'LOGISTICS_STAFF',
  CONTRACT_MANAGER: 'CONTRACT_MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};
