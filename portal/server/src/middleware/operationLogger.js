import prisma from '../prisma.js';

/**
 * 从路径推断操作类型和目标对象
 * /api/systems → { action: 'CREATE/UPDATE/DELETE', targetType: 'system' }
 * /api/systems/abc123 → { action: '...', targetType: 'system', targetId: 'abc123' }
 * /api/access → { action: '...', targetType: 'access' }
 */
function inferTarget(method, path) {
  // 去掉 /api/ 前缀
  const parts = path.replace(/^\/api\//, '').split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const resourceMap = {
    systems: '系统',
    access: '访问权限',
    auth: '认证',
    logs: '日志',
  };

  const resource = parts[0];
  const targetName = resourceMap[resource] || resource;
  const targetId = parts.length > 1 ? parts[1] : null;

  let action = 'UNKNOWN';
  if (method === 'POST') action = 'CREATE';
  else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
  else if (method === 'DELETE') action = 'DELETE';

  return { action, targetType: targetName, targetId };
}

/**
 * 脱敏请求体 — 移除密码等敏感字段
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const sanitized = { ...body };
  const sensitiveKeys = ['password', 'oldPassword', 'newPassword', 'secret', 'token', 'ssoToken'];
  for (const key of sensitiveKeys) {
    if (key in sanitized) sanitized[key] = '***';
  }
  try {
    return JSON.stringify(sanitized);
  } catch {
    return null;
  }
}

/**
 * 归一化 IP 地址
 * ::1 → 127.0.0.1, ::ffff:1.2.3.4 → 1.2.3.4
 */
function normalizeIp(ip) {
  if (!ip) return '127.0.0.1';
  if (ip === '::1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

/**
 * 获取客户端真实 IP（需配合 trust proxy + Vite xfwd）
 */
export function getClientIp(req) {
  // x-forwarded-for（Vite xfwd / nginx 设置，可能含多个IP，取第一个）
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return normalizeIp(forwarded.split(',')[0].trim());
  }
  // x-real-ip（nginx 设置）
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return normalizeIp(realIp.trim());
  }
  // 回退到 req.ip（trust proxy 生效时已解析 x-forwarded-for）
  const raw = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return normalizeIp(raw);
}

/**
 * 操作日志中间件 — 自动记录所有写操作 (POST/PUT/DELETE/PATCH)
 * 在路由之后执行，通过 res.on('finish') 捕获状态码
 */
export function operationLogger() {
  return (req, res, next) => {
    // 只记录写操作
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return next();
    }

    // 跳过不需要记录的路径（这些路径由业务代码手动记录日志）
    const skipPaths = [
      '/api/auth/login',
      '/api/auth/verify',
      '/api/auth/refresh',
      '/api/auth/access-system',
      '/api/logs',
      '/health',
    ];
    const fullPath = req.originalUrl || req.path;
    if (skipPaths.some((p) => fullPath === p || fullPath.startsWith(p + '/') || fullPath.startsWith(p + '?'))) {
      return next();
    }

    // 在响应完成后记录
    res.on('finish', () => {
      // 跳过 404
      if (res.statusCode === 404) return;

      const target = inferTarget(req.method, fullPath);

      // 从 req.user（authenticate 中间件设置）获取用户信息
      const user = req.user || {};
      const userEmail = user.email || 'anonymous';
      const userName = user.name || null;

      let logAction = target?.action || req.method;
      let logDetail = '';

      if (target) {
        const actionLabel = {
          CREATE: '新增', UPDATE: '修改', DELETE: '删除', UNKNOWN: req.method,
        }[logAction] || logAction;
        const idPart = target.targetId ? `(ID: ${target.targetId.substring(0, 8)})` : '';
        logDetail = `${actionLabel} ${target.targetType}${idPart}`;
      }

      // 异步写入，不阻塞响应
      prisma.auditLog
        .create({
          data: {
            userEmail: userEmail,
            userName: userName,
            action: logAction,
            systemCode: req.body?.systemCode || null,
            method: req.method,
            path: fullPath,
            targetType: target?.targetType || null,
            targetId: target?.targetId || null,
            detail: logDetail,
            requestBody: sanitizeBody(req.body),
            statusCode: res.statusCode,
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'] || null,
          },
        })
        .catch((err) => {
          console.error('[OperationLogger] 写入日志失败:', err.message);
        });
    });

    next();
  };
}

/**
 * 供子系统调用的日志上报函数
 * 子系统可通过 POST /api/logs/report 上报操作日志
 */
export async function reportOperationLog(data) {
  return prisma.auditLog.create({
    data: {
      userEmail: data.userEmail || 'unknown',
      userName: data.userName || null,
      action: data.action || 'UNKNOWN',
      systemCode: data.systemCode || null,
      method: data.method || null,
      path: data.path || null,
      targetType: data.targetType || null,
      targetId: data.targetId || null,
      detail: data.detail || '',
      requestBody: data.requestBody || null,
      statusCode: data.statusCode || null,
      ip: data.ip || null,
      userAgent: data.userAgent || null,
    },
  });
}
