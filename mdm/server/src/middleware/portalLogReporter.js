/**
 * 操作日志上报中间件 — MDM 子系统 → Portal 统一日志中心
 *
 * 支持 DELETE/UPDATE 预查询 + 变更对比
 */

import prisma from '../prisma.js';

const PORTAL_LOG_API = process.env.PORTAL_API_URL || 'http://localhost:4001/api/logs/report';
const SYSTEM_CODE = 'MDM';

const RESOURCE_MAP = {
  'master-data/departments': '主数据部门',
  'master-data/employees': '主数据员工',
  'data-mapping': '数据映射',
  'sync-config': '同步配置',
  'sync-log': '同步日志',
  'departments': '部门',
  'employees': '员工',
  'mappings': '数据映射',
};

const FIELD_LABELS = {
  code: '编码', name: '名称', category: '分类', spec: '规格', unit: '单位',
  status: '状态', description: '描述', remark: '备注', address: '地址',
  phone: '电话', email: '邮箱', contact: '联系人', empNo: '工号',
  gender: '性别', position: '职位', title: '职称', username: '用户名',
  role: '角色', enabled: '启用', active: '激活', type: '类型',
  level: '级别', priority: '优先级', sourceSystem: '源系统',
  targetSystem: '目标系统', syncRule: '同步规则',
};

const MODEL_CONFIG = {
  'departments': { model: 'MasterDepartment', labelFields: ['name'], diffFields: ['name', 'status'] },
  'employees':  { model: 'MasterEmployee',  labelFields: ['name'], diffFields: ['name', 'gender', 'phone', 'email', 'status'] },
  'mapping':    { model: 'DataMapping',     labelFields: [], diffFields: [] },
  'mappings':   { model: 'DataMapping',     labelFields: [], diffFields: [] },
  'config':     { model: 'SyncConfig',      labelFields: [], diffFields: [] },
  'logs':       { model: 'SyncLog',         labelFields: [], diffFields: [] },
};

const SKIP_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt', 'version', 'createdBy', 'updatedBy']);

function inferTarget(method, path) {
  const cleanPath = path.replace(/^\/api\//, '');
  const parts = cleanPath.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const twoLevel = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : '';
  const oneLevel = parts[0];
  const targetName = RESOURCE_MAP[twoLevel] || RESOURCE_MAP[oneLevel] || oneLevel;
  const targetId = parts.length > 2 ? parts[parts.length - 1] : null;
  const resourceSegment = parts.length >= 2
    ? (parts.length > 2 ? parts[parts.length - 2] : parts[1])
    : parts[0];

  let action = 'UNKNOWN';
  if (method === 'POST') action = 'CREATE';
  else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
  else if (method === 'DELETE') action = 'DELETE';

  return { action, targetType: targetName, targetId, resourceSegment };
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const sanitized = { ...body };
  for (const key of ['password', 'oldPassword', 'newPassword', 'secret', 'token', 'ssoToken']) {
    if (key in sanitized) sanitized[key] = '***';
  }
  try { return JSON.stringify(sanitized); } catch { return null; }
}

function normalizeIp(ip) {
  if (!ip) return '127.0.0.1';
  if (ip === '::1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return normalizeIp(forwarded.split(',')[0].trim());
  const realIp = req.headers['x-real-ip'];
  if (realIp) return normalizeIp(realIp.trim());
  return normalizeIp(req.ip || req.socket?.remoteAddress || '127.0.0.1');
}

function extractLabel(record, fields) {
  if (!record) return '';
  return fields.filter(f => record[f] != null).map(f => String(record[f])).join(' / ');
}

function formatValue(val) {
  if (val == null) return '(空)';
  if (typeof val === 'boolean') return val ? '是' : '否';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

async function preFetchRecord(resourceSegment, id, fields) {
  const config = MODEL_CONFIG[resourceSegment];
  if (!config?.model || !id || fields.length === 0) return null;
  const select = {};
  for (const f of fields) select[f] = true;
  try {
    return await prisma[config.model].findUnique({ where: { id }, select });
  } catch { return null; }
}

function buildDiffString(oldData, newData, diffFields) {
  if (!oldData || !newData) return '';
  const changes = [];
  for (const field of diffFields) {
    if (SKIP_FIELDS.has(field) || !(field in newData)) continue;
    const oldStr = formatValue(oldData[field]);
    const newStr = formatValue(newData[field]);
    if (oldStr === newStr) continue;
    const label = FIELD_LABELS[field] || field;
    changes.push(`${label}: "${oldStr}" → "${newStr}"`);
  }
  return changes.join(', ');
}

function buildDetail(target, method, body, preFetched) {
  if (!target) return `${method} 未知资源`;
  const actionLabel = { CREATE: '新增', UPDATE: '修改', DELETE: '删除' }[target.action] || target.action;
  const typeLabel = target.targetType || '未知';
  const config = MODEL_CONFIG[target.resourceSegment];

  if (target.action === 'DELETE') {
    if (preFetched && config?.labelFields) {
      const label = extractLabel(preFetched, config.labelFields);
      if (label) return `${actionLabel} ${typeLabel}[${label}]`;
    }
    return `${actionLabel} ${typeLabel}${target.targetId ? `(ID: ${target.targetId.substring(0, 8)})` : ''}`;
  }

  if (target.action === 'UPDATE' && body && preFetched && config?.diffFields) {
    let resourceLabel = '';
    if (config.labelFields) {
      resourceLabel = extractLabel(body, config.labelFields) || extractLabel(preFetched, config.labelFields);
    }
    const diffStr = buildDiffString(preFetched, body, config.diffFields);
    if (diffStr) {
      const lp = resourceLabel ? `[${resourceLabel}]: ` : ': ';
      return `${actionLabel} ${typeLabel}${lp}${diffStr}`;
    }
    if (resourceLabel) return `${actionLabel} ${typeLabel}[${resourceLabel}]`;
  }

  if (body && config?.labelFields) {
    const parts = config.labelFields.filter(f => body[f] != null).map(f => String(body[f]));
    if (parts.length > 0) return `${actionLabel} ${typeLabel}[${parts.join(' / ')}]`;
  }
  return `${actionLabel} ${typeLabel}`;
}

async function reportToPortal(logData) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(PORTAL_LOG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    console.warn('[PortalLogReporter] 上报失败:', err.message);
  }
}

export function portalLogReporter() {
  return async (req, res, next) => {
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return next();

    const skipPaths = ['/api/auth/sso-login', '/api/auth/login', '/health'];
    const fullPath = req.originalUrl || req.path;
    if (skipPaths.some(p => fullPath === p || fullPath.startsWith(p + '?'))) return next();

    const target = inferTarget(req.method, fullPath);

    let preFetched = null;
    if (target && target.targetId && target.resourceSegment) {
      const config = MODEL_CONFIG[target.resourceSegment];
      if (config?.model) {
        const needsPreFetch =
          target.action === 'DELETE' ||
          (target.action === 'UPDATE' && config.diffFields);
        if (needsPreFetch && config.labelFields) {
          const fetchFields = target.action === 'UPDATE'
            ? [...new Set([...config.labelFields, ...config.diffFields])]
            : config.labelFields;
          try {
            preFetched = await preFetchRecord(target.resourceSegment, target.targetId, fetchFields);
            req._logPreFetched = preFetched;
          } catch {}
        }
      }
    }

    res.on('finish', () => {
      if (res.statusCode === 404) return;
      const user = req.user || {};
      const detail = buildDetail(target, req.method, req.body, req._logPreFetched || null);
      reportToPortal({
        userEmail: user.email || user.username || 'unknown',
        userName: user.name || null,
        action: target?.action || req.method,
        systemCode: SYSTEM_CODE,
        method: req.method,
        path: fullPath,
        targetType: target?.targetType || null,
        targetId: target?.targetId || null,
        detail,
        requestBody: sanitizeBody(req.body),
        statusCode: res.statusCode,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || null,
      });
    });

    next();
  };
}

export default portalLogReporter;
