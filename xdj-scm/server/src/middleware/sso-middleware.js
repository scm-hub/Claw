/**
 * SSO 令牌验证中间件 — 共享文件
 *
 * 使用方法（子系统接入 SSO）：
 *
 * 1. 将此文件复制到子系统的 src/middleware/ 目录
 * 2. 在子系统的环境变量中设置 SSO_JWT_SECRET（与 SSO 中心相同）
 * 3. 在路由中使用：
 *
 *    import { ssoAuth } from './middleware/sso-middleware.js';
 *    router.get('/protected', ssoAuth, handler);
 *
 * 4. 如果子系统已有自己的 auth 中间件，可修改为优先验证 SSO 令牌，
 *    验证失败再回退到原有验证逻辑（过渡期兼容）
 */

import jwt from 'jsonwebtoken';

const SSO_JWT_SECRET = process.env.SSO_JWT_SECRET || 'xdj-portal-sso-secret-2026';
const SSO_VERIFY_URL = process.env.SSO_VERIFY_URL || 'http://localhost:4001/api/auth/verify';

/**
 * SSO 令牌验证中间件
 * 验证通过后，req.user 包含：
 * - userId: HRMS 用户 ID
 * - email: 用户邮箱
 * - name: 用户姓名
 * - role: 用户角色（SUPER_ADMIN / HR_ADMIN / MANAGER / EMPLOYEE）
 * - employeeId: 员工 ID
 * - employeeNo: 工号
 * - departmentId: 部门 ID
 * - departmentName: 部门名称
 * - systems: 可访问的系统编码列表
 * - source: 'sso'
 */
export function ssoAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SSO_JWT_SECRET);

    if (decoded.source !== 'sso') {
      return res.status(401).json({ success: false, message: '非 SSO 令牌' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '令牌已过期，请重新登录' });
    }
    return res.status(401).json({ success: false, message: '令牌无效' });
  }
}

/**
 * SSO 令牌验证（远程验证版本）
 * 通过 HTTP 调用 SSO 中心的 /api/auth/verify 接口验证
 * 更安全（实时检查权限变更），但每次请求多一次 HTTP 调用
 * 适用于对安全性要求较高的场景
 */
export async function ssoAuthRemote(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const resp = await fetch(SSO_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const data = await resp.json();

    if (!resp.ok || !data.success) {
      return res.status(401).json({ success: false, message: data.message || 'SSO 验证失败' });
    }

    req.user = data.data;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'SSO 服务不可用' });
  }
}

export default ssoAuth;
