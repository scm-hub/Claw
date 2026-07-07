import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const HRMS_API_URL = process.env.HRMS_API_URL || 'http://localhost:4002';

async function getHrmsAdminToken() {
  const resp = await fetch(`${HRMS_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hrms.com', password: process.env.HRMS_ADMIN_PASSWORD || 'admin123' }),
  });
  const data = await resp.json();
  if (!data.success) throw new Error('获取 HRMS 管理员 token 失败');
  return data.data.token;
}

/**
 * GET /api/employees
 * 获取 HRMS 在职员工列表（供权限管理页面使用）
 */
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const token = await getHrmsAdminToken();
    const { search, departmentId } = req.query;
    const params = new URLSearchParams({ page: '1', pageSize: '500', status: 'ACTIVE' });
    if (search) params.set('search', search);
    if (departmentId) params.set('departmentId', departmentId);

    const resp = await fetch(`${HRMS_API_URL}/api/employees?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (!data.success) {
      return res.status(500).json({ success: false, message: '获取员工列表失败' });
    }

    // 返回简化的员工列表
    const employees = (data.data?.list || data.data || []).map((emp) => ({
      id: emp.id,
      employeeNo: emp.employeeNo,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department?.name || '',
      departmentId: emp.departmentId,
      position: emp.positionTitle || emp.position || '',
      status: emp.status,
    }));

    res.json({ success: true, data: employees });
  } catch (err) {
    next(err);
  }
});

export default router;
