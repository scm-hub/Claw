// 跨库审批人解析器 — 查询 HRMS 和 Portal 数据库解析真实审批人
// 解决 resolveNodeApprover 只存占位符导致"待我审批"页面看不到任务的问题

import mysql from 'mysql2/promise';

// 连接池（懒加载）
let hrmsPool = null;
let portalPool = null;

const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'Scm@2025!',
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
};

function getHrmsPool() {
  if (!hrmsPool) {
    hrmsPool = mysql.createPool({ ...DB_CONFIG, database: 'hrms' });
  }
  return hrmsPool;
}

function getPortalPool() {
  if (!portalPool) {
    portalPool = mysql.createPool({ ...DB_CONFIG, database: 'portal_db' });
  }
  return portalPool;
}

/**
 * 解析部门主管审批人
 * 查询链路: submitterId(globalId) → Employee → Department.managerId → Manager Employee
 * @param {string} submitterId - 提交人的 globalId
 * @returns {Promise<Array<{id, name, email}>>} 审批人列表
 */
export async function resolveDeptManager(submitterId) {
  const pool = getHrmsPool();

  // 1. 通过 globalId 找到提交人的 departmentId
  const [empRows] = await pool.execute(
    'SELECT id, globalId, name, email, departmentId FROM Employee WHERE globalId = ? LIMIT 1',
    [submitterId]
  );

  if (empRows.length === 0) {
    console.warn(`[Resolver] 未找到 globalId=${submitterId} 的员工，尝试用 employeeNo 匹配`);
    // 回退：可能 submitterId 是 HRMS 内部 ID
    const [empRows2] = await pool.execute(
      'SELECT id, globalId, name, email, departmentId FROM Employee WHERE id = ? LIMIT 1',
      [submitterId]
    );
    if (empRows2.length === 0) {
      console.error(`[Resolver] 完全找不到提交人: ${submitterId}`);
      return [];
    }
    empRows.push(...empRows2);
  }

  const emp = empRows[0];
  if (!emp.departmentId) {
    console.error(`[Resolver] 提交人 ${emp.name} 没有部门`);
    return [];
  }

  // 2. 查部门主管
  const [deptRows] = await pool.execute(
    'SELECT managerId FROM Department WHERE id = ? LIMIT 1',
    [emp.departmentId]
  );

  if (deptRows.length === 0 || !deptRows[0].managerId) {
    console.warn(`[Resolver] 部门 ${emp.departmentId} 没有设置主管`);
    return [];
  }

  // 3. 查主管员工信息
  const [mgrRows] = await pool.execute(
    'SELECT id, globalId, name, email FROM Employee WHERE id = ? LIMIT 1',
    [deptRows[0].managerId]
  );

  if (mgrRows.length === 0) {
    console.error(`[Resolver] 部门主管 ID=${deptRows[0].managerId} 不存在`);
    return [];
  }

  const mgr = mgrRows[0];
  return [{
    id: mgr.globalId,
    name: mgr.name,
    email: mgr.email || '',
  }];
}

/**
 * 解析角色审批人
 * 查询链路: approverRole(scmRole) → Portal Role → UserRole → PortalUser
 * @param {string} approverRole - SCM 角色代码（如 SALES_MANAGER, PURCHASE_MANAGER）
 * @returns {Promise<Array<{id, name, email}>>} 审批人列表
 */
export async function resolveRoleApprovers(approverRole) {
  const pool = getPortalPool();

  // 1. 查 Role 表，通过 scmRole 匹配
  const [roleRows] = await pool.execute(
    'SELECT id FROM role WHERE scmRole = ? LIMIT 1',
    [approverRole]
  );

  if (roleRows.length === 0) {
    console.warn(`[Resolver] 未找到 scmRole=${approverRole} 的角色，尝试用 name 匹配`);
    // 回退：用 role.name 匹配
    const [roleRows2] = await pool.execute(
      'SELECT id FROM role WHERE name = ? LIMIT 1',
      [approverRole]
    );
    if (roleRows2.length === 0) {
      console.error(`[Resolver] 完全找不到角色: ${approverRole}`);
      return [];
    }
    roleRows.push(...roleRows2);
  }

  const roleId = roleRows[0].id;

  // 2. 查 UserRole 表，找到分配了该角色的用户
  const [userRoleRows] = await pool.execute(
    'SELECT userEmail FROM user_role WHERE roleId = ?',
    [roleId]
  );

  if (userRoleRows.length === 0) {
    console.warn(`[Resolver] 角色 ${approverRole} 没有分配给任何用户`);
    return [];
  }

  // 3. 查 PortalUser 表，获取 globalId、name、email
  const approvers = [];
  for (const ur of userRoleRows) {
    const [puRows] = await pool.execute(
      'SELECT globalId, name, email FROM portal_user WHERE email = ? AND isActive = 1 LIMIT 1',
      [ur.userEmail]
    );
    if (puRows.length > 0 && puRows[0].globalId) {
      approvers.push({
        id: puRows[0].globalId,
        name: puRows[0].name || '',
        email: puRows[0].email || '',
      });
    }
  }

  return approvers;
}

/**
 * 统一解析节点审批人
 * @param {Object} node - 流程节点配置
 * @param {string} submitterId - 提交人 globalId
 * @returns {Promise<Array<{id, name, email}>>} 审批人列表
 */
export async function resolveNodeApprover(node, submitterId) {
  const approverType = node.type || 'role';

  // 固定人员 — 从 portal_user 校验 userId，防止幽灵 ID
  if (approverType === 'person') {
    const userId = node.approverUserId || node.approverId;
    let name = node.approverName || '';
    let email = node.approverEmail || '';
    let validId = userId;

    if (userId) {
      try {
        const portalPool = getPortalPool();
        const [rows] = await portalPool.execute(
          'SELECT globalId, name, email FROM portal_user WHERE globalId = ? OR id = ? LIMIT 1',
          [userId, userId]
        );
        if (rows.length > 0) {
          // 找到了 → 用 portal 里的 globalId 和名字
          validId = rows[0].globalId || userId;
          name = name || rows[0].name || '';
          email = email || rows[0].email || '';
        } else if (name) {
          // userId 无效但给了名字 → 按名字反查
          const [nameRows] = await portalPool.execute(
            'SELECT globalId, name, email FROM portal_user WHERE name = ? AND isActive = 1 LIMIT 1',
            [name]
          );
          if (nameRows.length > 0) {
            validId = nameRows[0].globalId;
            email = email || nameRows[0].email || '';
            console.log(`[Resolver] person "${name}" userId=${userId} 无效，按名字反查 → ${validId}`);
          }
        }
      } catch (err) {
        console.warn(`[Resolver] 查 portal_user 失败: ${userId}`, err.message);
      }
    }

    // 如果最终仍无有效 ID，返回空（不创建无效审批任务）
    if (!validId) {
      console.error(`[Resolver] person 节点 "${node.nodeName}" 无有效审批人，跳过`);
      return [];
    }
    return [{ id: validId, name, email }];
  }

  // 部门主管
  if (approverType === 'dept_manager') {
    const managers = await resolveDeptManager(submitterId);
    if (managers.length > 0) return managers;

    // 部门主管找不到 → 回退到角色审批（如果有 approverRole）
    if (node.approverRole) {
      console.log(`[Resolver] dept_manager 未找到，回退到角色 ${node.approverRole}`);
      const roleApprovers = await resolveRoleApprovers(node.approverRole);
      if (roleApprovers.length > 0) return roleApprovers;
    }

    // 最终回退：返回占位符（但不影响流程继续）
    console.warn(`[Resolver] 无法解析审批人，使用占位符`);
    return [{
      id: 'dept_manager:' + submitterId,
      name: '部门主管',
      email: '',
    }];
  }

  // 角色审批
  if (approverType === 'role') {
    const roleApprovers = await resolveRoleApprovers(node.approverRole || node.approverId);
    if (roleApprovers.length > 0) return roleApprovers;

    console.warn(`[Resolver] 角色 ${node.approverRole} 未找到审批人`);
    return [{
      id: node.approverRole || 'UNKNOWN',
      name: node.approverRole || '',
      email: '',
    }];
  }

  // 会签/或签
  if (approverType === 'countersign' || approverType === 'any_sign') {
    const approvers = node.approvers || [];
    return approvers.map(a => ({
      id: a.id || a.globalId,
      name: a.name || '',
      email: a.email || '',
    }));
  }

  // 默认
  return [{
    id: node.approverRole || 'UNKNOWN',
    name: node.approverRole || '',
    email: '',
  }];
}

/**
 * 关闭连接池（进程退出时调用）
 */
export async function closeResolverPools() {
  if (hrmsPool) await hrmsPool.end();
  if (portalPool) await portalPool.end();
}
