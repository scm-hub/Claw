/**
 * 组织上下文中间件
 * 从请求头 X-Org-Code 中读取当前组织编码，写入 req.orgCode
 * 若无 X-Org-Code，从 JWT 中读取用户默认组织作为兜底
 */

export function orgContext(req, res, next) {
  // 1. 优先从请求头读取（前端切换组织时写入）
  const headerOrg = req.headers['x-org-code'];
  if (headerOrg && typeof headerOrg === 'string' && headerOrg.trim()) {
    req.orgCode = headerOrg.trim();
    return next();
  }

  // 2. 兜底：从用户认证信息中读取（JWT 中的默认组织或其他来源）
  // 注意：此时 req.user 可能尚未挂载（orgContext 在 authenticate 之后调用时已有）
  if (req.user) {
    // 用户级默认组织（后续可从 User 表扩展）
    req.orgCode = req.user.orgCode || null;
  }

  // 3. 不阻碍流程：允许 orgCode 为空（超级管理员可看全部）
  next();
}

/**
 * 获取请求中的组织过滤条件（用于 Prisma where 查询）
 * @param {Object} req - Express req 对象
 * @param {Object} [overrides] - 可选覆盖条件
 * @returns {{ orgCode: string } | {}}
 */
export function getOrgFilter(req, overrides = {}) {
  // 有明确的组织编码时，始终按组织过滤
  if (req.orgCode) {
    return { orgCode: req.orgCode, ...overrides };
  }
  // 无组织编码：超级管理员可以看全部，否则不加过滤（兼容旧逻辑）
  if (!req.user || req.user.role === 'SUPER_ADMIN') {
    return overrides;
  }
  return overrides;
}
