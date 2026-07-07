/**
 * 操作日志上报中间件 — 将子系统操作日志上报到 Portal 统一日志中心
 *
 * 工作原理：
 * 1. 拦截所有 POST/PUT/DELETE/PATCH 请求（写操作）
 * 2. 从 req.user 提取用户信息（由 authenticate 中间件设置）
 * 3. 从 URL 路径推断操作对象类型（产品/客户/供应商等）
 * 4. 【增强】对于 DELETE/PUT 请求，在进入路由前预查询数据库获取记录
 *    - DELETE → 获取被删记录的标识字段（code/name）
 *    - PUT   → 获取旧记录，与请求体对比，生成变更差异
 * 5. 响应完成后异步 POST 到 Portal 的 /api/logs/report
 * 6. 不阻塞响应，失败静默（不影响业务流程）
 */

import prisma from '../shared/prisma.js';

// Portal 日志中心 API 地址
const PORTAL_LOG_API = process.env.PORTAL_API_URL || 'http://localhost:4001/api/logs/report';

// 子系统编码
const SYSTEM_CODE = 'scm';

/**
 * SCM 路径 → 中文资源名称映射
 */
const RESOURCE_MAP = {
  'master/materials': '产品',
  'master/customers': '客户',
  'master/suppliers': '供应商',
  'master/employees': '员工',
  'master/departments': '部门',
  'master/warehouses': '仓库',
  'master/zones': '库区',
  'master/locations': '库位',
  'master/data-centers': '数据中心',
  'auth/users': '系统用户',
  'purchase/orders': '采购订单',
  'purchase/suppliers': '采购供应商',
  'sales/orders': '销售订单',
  'wms/inventory': '库存',
  'wms/stock-in': '入库单',
  'wms/stock-out': '出库单',
  'wms/transfers': '调拨单',
  'finance/invoices': '发票',
  'finance/payments': '付款单',
  'finance/receipts': '收款单',
  'logistics/shipments': '发货单',
  'logistics/routes': '物流路线',
  'coldchain/monitors': '冷链监控',
  'coldchain/alerts': '冷链告警',
  'contract/contracts': '合同',
  'aftersales/orders': '售后单',
  'approval/flows': '审批流程',
  'barcode/rules': '条码规则',
  'traceability/batches': '追溯批次',
};

/**
 * 字段名 → 中文标签映射（用于变更对比展示）
 */
const FIELD_LABELS = {
  code: '编码',
  name: '名称',
  category: '分类',
  spec: '规格',
  unit: '单位',
  status: '状态',
  description: '描述',
  remark: '备注',
  address: '地址',
  phone: '电话',
  email: '邮箱',
  contact: '联系人',
  price: '价格',
  quantity: '数量',
  stock: '库存',
  minStock: '最低库存',
  maxStock: '最高库存',
  empNo: '工号',
  gender: '性别',
  position: '职位',
  title: '职称',
  username: '用户名',
  role: '角色',
  enabled: '启用',
  active: '激活',
  type: '类型',
  level: '级别',
  priority: '优先级',
  sortOrder: '排序',
  color: '颜色',
  capacity: '容量',
  batchNo: '批次号',
  materialCode: '物料编码',
  materialName: '物料名称',
  supplierCode: '供应商编码',
  customerCode: '客户编码',
  warehouseCode: '仓库编码',
  departmentCode: '部门编码',
  startDate: '开始日期',
  endDate: '结束日期',
  expiryDate: '到期日期',
  // 通用 fallback
  value: '值',
  text: '文本',
  label: '标签',
};

/**
 * 路径段 → Prisma Model 配置
 * 用于预查询：DELETE 取标识字段, UPDATE 取全部可对比字段
 */
const MODEL_CONFIG = {
  'materials':     { model: 'material',    labelFields: ['code', 'name'], diffFields: ['code', 'name', 'category', 'spec', 'unit', 'status'] },
  'customers':     { model: 'customer',    labelFields: ['code', 'name'], diffFields: ['code', 'name', 'contact', 'phone', 'address', 'status'] },
  'suppliers':     { model: 'supplier',    labelFields: ['code', 'name'], diffFields: ['code', 'name', 'contact', 'phone', 'address', 'status'] },
  'employees':     { model: 'employee',    labelFields: ['empNo', 'name'], diffFields: ['empNo', 'name', 'gender', 'position', 'phone', 'email', 'departmentId'] },
  'departments':   { model: 'department',  labelFields: ['code', 'name'], diffFields: ['code', 'name', 'description'] },
  'warehouses':    { model: 'warehouse',   labelFields: ['code', 'name'], diffFields: ['code', 'name', 'address', 'status'] },
  'zones':         { model: 'warehouseZone', labelFields: ['code', 'name'], diffFields: ['code', 'name'] },
  'locations':     { model: 'warehouseLocation', labelFields: ['code', 'name'], diffFields: ['code', 'name'] },
  'data-centers':  { model: 'dataCenter',  labelFields: ['name'], diffFields: ['name', 'description'] },
  'users':         { model: 'user',        labelFields: ['username'], diffFields: ['username', 'role', 'enabled'] },
  'batches':       { model: 'batch',       labelFields: ['batchNo'], diffFields: ['batchNo', 'quantity', 'expiryDate'] },
  'orders':        { model: null },
  'inventory':     { model: null },
  'stock-in':      { model: null },
  'stock-out':     { model: null },
  'transfers':     { model: null },
  'invoices':      { model: null },
  'payments':      { model: null },
  'receipts':      { model: null },
  'shipments':     { model: null },
  'routes':        { model: null },
  'monitors':      { model: null },
  'alerts':        { model: null },
  'contracts':     { model: null },
};

/** 需要跳过对比的系统 / 内部字段 */
const SKIP_DIFF_FIELDS = new Set([
  'id', 'createdAt', 'updatedAt', 'deletedAt',
  'version', 'createdBy', 'updatedBy',
]);

/**
 * 从请求路径推断操作对象类型
 */
function inferTarget(method, path) {
  const cleanPath = path.replace(/^\/api\//, '');
  const parts = cleanPath.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const twoLevel = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : '';
  const oneLevel = parts[0];

  const targetName = RESOURCE_MAP[twoLevel] || RESOURCE_MAP[oneLevel] || null;
  const targetId = parts.length > 2 ? parts[parts.length - 1] : null;
  const resourceSegment = parts.length >= 2
    ? (parts.length > 2 ? parts[parts.length - 2] : parts[1])
    : parts[0];

  let action = 'UNKNOWN';
  if (method === 'POST') action = 'CREATE';
  else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
  else if (method === 'DELETE') action = 'DELETE';

  return { action, targetType: targetName || oneLevel, targetId, resourceSegment };
}

/**
 * 脱敏请求体
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const sanitized = { ...body };
  const sensitiveKeys = ['password', 'oldPassword', 'newPassword', 'secret', 'token', 'ssoToken', 'passwordHash'];
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
function getClientIp(req) {
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
 * 从记录对象提取业务标识字符串
 */
function extractLabel(record, labelFields) {
  if (!record) return '';
  const parts = [];
  for (const field of labelFields) {
    if (record[field] != null) {
      parts.push(String(record[field]));
    }
  }
  return parts.join(' / ');
}

/**
 * 格式化值为可读字符串
 */
function formatValue(val) {
  if (val === null || val === undefined) return '(空)';
  if (typeof val === 'boolean') return val ? '是' : '否';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/**
 * 预查询记录（用于 DELETE 标识 或 UPDATE 对比）
 *
 * @param {string} resourceSegment - URL 资源段
 * @param {string} id - 记录 ID
 * @param {string[]} fields - 需要查询的字段列表
 * @returns {Promise<Object|null>}
 */
async function preFetchRecord(resourceSegment, id, fields) {
  const config = MODEL_CONFIG[resourceSegment];
  if (!config?.model || !id) return null;

  const select = {};
  for (const f of fields) {
    select[f] = true;
  }

  try {
    const record = await prisma[config.model].findUnique({
      where: { id },
      select,
    });
    return record;
  } catch {
    return null;
  }
}

/**
 * 生成新旧数据变更对比描述
 *
 * @param {Object} oldData - 数据库中的旧记录
 * @param {Object} newData - 请求体中的新数据
 * @param {string[]} diffFields - 可对比的字段列表
 * @returns {string} 如 "名称: "馒头组"→"新馒头组", 规格: "1kg"→"2kg""
 */
function buildDiffString(oldData, newData, diffFields) {
  if (!oldData || !newData) return '';

  const changes = [];

  for (const field of diffFields) {
    // 跳过系统字段
    if (SKIP_DIFF_FIELDS.has(field)) continue;
    // 新数据中没传这个字段 → 不是本次修改的字段
    if (!(field in newData)) continue;

    const oldValue = oldData[field];
    const newValue = newData[field];

    // 值相同 → 无变化，跳过
    if (oldValue === newValue) continue;

    // 类型不同时做宽松比较（如数字字符串 vs 数字）
    const oldStr = formatValue(oldValue);
    const newStr = formatValue(newValue);

    if (oldStr === newStr) continue;

    const label = FIELD_LABELS[field] || field;
    changes.push(`${label}: "${oldStr}" → "${newStr}"`);
  }

  return changes.join(', ');
}

/**
 * 构建操作详情描述
 *
 * CREATE: "新增 产品[M006 / 馒头组]"
 * UPDATE: "修改 产品[M006 / 馒头组]: 名称: "馒头组"→"新馒头组", 规格: "1kg"→"2kg""
 * DELETE: "删除 产品[M006 / 馒头组]"
 */
function buildDetail(target, method, body, preFetched) {
  if (!target) return `${method} 未知资源`;

  const actionLabel = {
    CREATE: '新增',
    UPDATE: '修改',
    DELETE: '删除',
    UNKNOWN: method,
  }[target.action] || target.action;

  const typeLabel = target.targetType || '未知';
  const config = MODEL_CONFIG[target.resourceSegment];

  // ---- DELETE ----
  if (target.action === 'DELETE') {
    if (preFetched && config?.labelFields) {
      const label = extractLabel(preFetched, config.labelFields);
      if (label) return `${actionLabel} ${typeLabel}[${label}]`;
    }
    const idPart = target.targetId ? `(ID: ${target.targetId.substring(0, 8)})` : '';
    return `${actionLabel} ${typeLabel}${idPart}`;
  }

  // ---- UPDATE（带变更对比）----
  if ((target.action === 'UPDATE') && body && preFetched && config?.diffFields) {
    // 先构建资源标识
    let resourceLabel = '';
    if (config.labelFields) {
      // 优先用新数据的标识字段（可能被改了），fallback 用旧的
      const newLabel = extractLabel(body, config.labelFields);
      const oldLabel = extractLabel(preFetched, config.labelFields);
      resourceLabel = newLabel || oldLabel;
    }

    // 生成变更对比
    const diffStr = buildDiffString(preFetched, body, config.diffFields);

    if (diffStr) {
      const labelPart = resourceLabel ? `[${resourceLabel}]: ` : ': ';
      return `${actionLabel} ${typeLabel}${labelPart}${diffStr}`;
    }

    // 没有实际变更（或无法对比），显示基本信息
    if (resourceLabel) {
      return `${actionLabel} ${typeLabel}[${resourceLabel}]`;
    }
  }

  // ---- CREATE / UPDATE fallback（无对比） ----
  if (body && config?.labelFields) {
    const labelParts = [];
    for (const f of config.labelFields) {
      if (body[f] != null) labelParts.push(String(body[f]));
    }
    if (labelParts.length > 0) {
      return `${actionLabel} ${typeLabel}[${labelParts.join(' / ')}]`;
    }
  }

  return `${actionLabel} ${typeLabel}`;
}

/**
 * 异步上报日志到 Portal（不阻塞，失败静默）
 */
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

/**
 * 操作日志上报中间件
 */
export function portalLogReporter() {
  return async (req, res, next) => {
    // 只记录写操作
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return next();
    }

    // 跳过不需要记录的路径
    const skipPaths = ['/api/auth/sso-login', '/api/auth/login', '/health'];
    const fullPath = req.originalUrl || req.path;
    if (skipPaths.some((p) => fullPath === p || fullPath.startsWith(p + '?'))) {
      return next();
    }

    const target = inferTarget(req.method, fullPath);

    // 【关键】DELETE / PUT 请求：在路由处理前预查询数据库
    let preFetched = null;
    if (target && target.targetId && target.resourceSegment) {
      const config = MODEL_CONFIG[target.resourceSegment];
      if (config?.model) {
        // DELETE: 只需要 labelFields（用于显示被删记录名称）
        // PUT/PATCH: 需要 diffFields + labelFields（用于变更对比）
        const needsPreFetch =
          target.action === 'DELETE' ||
          (target.action === 'UPDATE' && config.diffFields);

        if (needsPreFetch) {
          const fetchFields = target.action === 'UPDATE'
            ? [...new Set([...(config.labelFields || []), ...(config.diffFields || [])])]
            : config.labelFields || [];

          if (fetchFields.length > 0) {
            try {
              preFetched = await preFetchRecord(target.resourceSegment, target.targetId, fetchFields);
              req._logPreFetched = preFetched;
            } catch {
              // 预查询失败不阻塞业务
            }
          }
        }
      }
    }

    // 在响应完成后记录
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
