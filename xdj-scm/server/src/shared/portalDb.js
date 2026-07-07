/**
 * Portal DB 查询工具
 *
 * SCM 后端需要跨库查询 Portal 权限数据（portal_db），
 * 此模块提供 mysql2 连接池和常用查询函数。
 *
 * 使用场景：
 * - 获取有 SCM 某模块权限的用户邮箱列表
 * - 获取用户的角色权限聚合
 */

import mysql from 'mysql2/promise';

const PORTAL_DB_CONFIG = {
  host: process.env.PORTAL_DB_HOST || 'localhost',
  port: parseInt(process.env.PORTAL_DB_PORT || '3306'),
  user: process.env.PORTAL_DB_USER || 'root',
  password: process.env.PORTAL_DB_PASSWORD || 'Scm@2025!',
  database: process.env.PORTAL_DB_NAME || 'portal_db',
};

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...PORTAL_DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

/**
 * 获取拥有 SCM 指定模块权限的用户邮箱列表
 *
 * @param {string[]} moduleCodes - SCM 模块编码数组（如 ['purchase', 'purchase-plans']）
 *   传入父级模块编码 'purchase' 会自动匹配子模块 'purchase-plans' 等
 * @param {object} options - 选项
 *   excludeSystemAdmin: boolean — 是否排除超级管理员（isSystem=1），默认 false
 *   用于角色下拉等场景，只显示有具体模块权限的用户，不包含系统管理员
 * @returns {string[]} 有权限的用户邮箱列表
 *
 * 查询逻辑：
 *   user_role → role → role_permission (systemCode='scm')
 *   moduleCode 匹配：精确匹配 OR 以 moduleCode- 开头（覆盖子功能点）
 */
export async function getScmModuleUserEmails(moduleCodes = ['purchase'], options = {}) {
  const db = getPool();

  // 构建模块匹配条件：精确匹配 OR 前缀匹配（覆盖 purchase-plans, purchase-orders 等）
  const conditions = moduleCodes.map((mc) => `(rp.moduleCode = ? OR rp.moduleCode LIKE ?)`).join(' OR ');
  const params = [];
  for (const mc of moduleCodes) {
    params.push(mc, `${mc}%`);
  }

  // 超级管理员角色（isSystem=1）直接拥有所有模块，单独查询
  const [rows] = await db.execute(
    `SELECT DISTINCT ur.userEmail
     FROM user_role ur
     JOIN role r ON ur.roleId = r.id
     JOIN role_permission rp ON ur.roleId = rp.roleId
     WHERE rp.systemCode = 'scm'
       AND (${conditions})
       AND r.isSystem = 0`,
    params,
  );

  const emailSet = new Set();
  for (const row of rows) emailSet.add(row.userEmail.toLowerCase());

  // 超级管理员用户（isSystem=1的角色拥有所有模块）
  // 默认包含，但 excludeSystemAdmin=true 时排除（用于角色下拉等场景）
  if (!options.excludeSystemAdmin) {
    const [adminRows] = await db.execute(
      `SELECT DISTINCT ur.userEmail
       FROM user_role ur
       JOIN role r ON ur.roleId = r.id
       WHERE r.isSystem = 1`,
    );
    for (const row of adminRows) emailSet.add(row.userEmail.toLowerCase());
  }

  return Array.from(emailSet);
}

/**
 * 关闭连接池（服务关闭时调用）
 */
export async function closePortalDbPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export default { getPool, getScmModuleUserEmails, closePortalDbPool };
