const ROLE_HIERARCHY = {
  SUPER_ADMIN: 4,
  HR_ADMIN: 3,
  MANAGER: 2,
  EMPLOYEE: 1,
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const hasRole = allowedRoles.some((role) => {
      const requiredLevel = ROLE_HIERARCHY[role] || 0;
      return userLevel >= requiredLevel;
    });
    if (!hasRole) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    next();
  };
};

export const isSelfOrAdmin = (req, res, next) => {
  const targetUserId = req.params.userId || req.body.userId;
  if (
    req.user.role === 'SUPER_ADMIN' ||
    req.user.role === 'HR_ADMIN' ||
    req.user.userId === targetUserId
  ) {
    return next();
  }
  return res.status(403).json({ success: false, message: '只能操作自己的数据' });
};
