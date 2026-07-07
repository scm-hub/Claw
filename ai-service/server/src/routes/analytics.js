import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { hrmsApi, scmApi, mdmApi, getSsoToken } from '../services/api-clients.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/analytics/overview
 * 全平台数据概览 — 汇总 HRMS + SCM + MDM 核心指标
 */
router.get('/overview', async (req, res) => {
  try {
    const ssoToken = getSsoToken(req);

    const [hrmsEmps, scmStats, mdmDashboard, scmOrders] = await Promise.allSettled([
      hrmsApi(ssoToken, '/api/employees?pageSize=1'),
      scmApi(ssoToken, '/api/wms/inventory/stats'),
      mdmApi(ssoToken, '/api/dashboard'),
      scmApi(ssoToken, '/api/sales/orders?pageSize=100'),
    ]);

    const empData = hrmsEmps.status === 'fulfilled' ? hrmsEmps.value : {};
    const statsData = scmStats.status === 'fulfilled' ? scmStats.value : {};
    const mdmData = mdmDashboard.status === 'fulfilled' ? mdmDashboard.value : {};
    const ordersData = scmOrders.status === 'fulfilled' ? scmOrders.value : {};

    const orders = ordersData?.list || [];
    const totalSalesAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    res.json({
      success: true,
      data: {
        hrms: {
          totalEmployees: empData?.total || 0,
          status: hrmsEmps.status,
        },
        scm: {
          totalSKUs: statsData?.totalSKUs || 0,
          lowStock: statsData?.lowStock || 0,
          totalBatches: statsData?.totalBatches || 0,
          totalOrders: ordersData?.total || 0,
          totalSalesAmount,
          status: scmStats.status,
        },
        mdm: {
          departments: mdmData?.masterData?.departments || 0,
          employees: mdmData?.masterData?.employees || 0,
          syncPending: mdmData?.scmSync?.pending || 0,
          syncFailed: mdmData?.scmSync?.failed || 0,
          status: mdmDashboard.status,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message, data: null });
  }
});

/**
 * GET /api/analytics/sales
 * 销售数据分析
 */
router.get('/sales', async (req, res) => {
  try {
    const ssoToken = getSsoToken(req);
    const data = await scmApi(ssoToken, '/api/sales/orders?pageSize=100');
    const orders = data?.list || [];

    // 按状态统计
    const byStatus = {};
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    }

    // 按客户统计
    const byCustomer = {};
    for (const o of orders) {
      const name = o.customer?.name || '未知';
      byCustomer[name] = (byCustomer[name] || 0) + Number(o.totalAmount || 0);
    }

    // 按日期统计
    const byDate = {};
    for (const o of orders) {
      const date = (o.orderDate || o.createdAt || '').slice(0, 10);
      if (date) {
        byDate[date] = (byDate[date] || 0) + Number(o.totalAmount || 0);
      }
    }

    // Top 5 客户
    const topCustomers = Object.entries(byCustomer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }));

    // 日期趋势
    const dateTrend = Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([date, amount]) => ({ date, amount: Math.round(amount) }));

    res.json({
      success: true,
      data: {
        totalOrders: data?.total || 0,
        totalAmount: orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0),
        avgOrderAmount: orders.length > 0 ? Math.round(orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0) / orders.length) : 0,
        byStatus,
        topCustomers,
        dateTrend,
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message, data: null });
  }
});

/**
 * GET /api/analytics/inventory
 * 库存数据分析
 */
router.get('/inventory', async (req, res) => {
  try {
    const ssoToken = getSsoToken(req);
    const [statsData, invData] = await Promise.all([
      scmApi(ssoToken, '/api/wms/inventory/stats'),
      scmApi(ssoToken, '/api/wms/inventory?pageSize=200'),
    ]);

    const items = invData?.list || [];

    // 按仓库统计
    const byWarehouse = {};
    for (const item of items) {
      const name = item.warehouse?.name || '未知';
      if (!byWarehouse[name]) byWarehouse[name] = { count: 0, totalQty: 0 };
      byWarehouse[name].count++;
      byWarehouse[name].totalQty += item.qty || 0;
    }

    // 按物料分类统计
    const byCategory = {};
    for (const item of items) {
      const cat = item.material?.category || '未分类';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, totalQty: 0 };
      byCategory[cat].count++;
      byCategory[cat].totalQty += item.qty || 0;
    }

    // 库存分布
    const distribution = {
      critical: items.filter(i => (i.availableQty ?? i.qty) <= 10).length,
      low: items.filter(i => { const a = i.availableQty ?? i.qty; return a > 10 && a <= 30; }).length,
      medium: items.filter(i => { const a = i.availableQty ?? i.qty; return a > 30 && a <= 100; }).length,
      healthy: items.filter(i => (i.availableQty ?? i.qty) > 100).length,
    };

    res.json({
      success: true,
      data: {
        totalSKUs: statsData?.totalSKUs || items.length,
        lowStock: statsData?.lowStock || 0,
        totalBatches: statsData?.totalBatches || 0,
        warehouses: statsData?.warehouses || [],
        byWarehouse: Object.entries(byWarehouse).map(([name, d]) => ({ name, ...d })),
        byCategory: Object.entries(byCategory).map(([name, d]) => ({ name, ...d })),
        distribution,
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message, data: null });
  }
});

/**
 * GET /api/analytics/hr
 * 人力资源数据分析
 */
router.get('/hr', async (req, res) => {
  try {
    const ssoToken = getSsoToken(req);
    const [empData, deptData] = await Promise.allSettled([
      hrmsApi(ssoToken, '/api/employees?pageSize=200'),
      hrmsApi(ssoToken, '/api/departments'),
    ]);

    const employees = empData.status === 'fulfilled' ? (empData.value?.data || empData.value?.list || []) : [];
    const departments = deptData.status === 'fulfilled' ? (deptData.value?.data || deptData.value?.list || deptData.value || []) : [];

    // 按部门统计
    const byDepartment = {};
    for (const emp of employees) {
      const name = emp.department?.name || emp.departmentName || '未分配';
      byDepartment[name] = (byDepartment[name] || 0) + 1;
    }

    // 按状态统计
    const byStatus = {};
    for (const emp of employees) {
      const status = emp.status || 'UNKNOWN';
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        totalEmployees: empData.status === 'fulfilled' ? (empData.value?.total || empData.value?.data?.length || 0) : 0,
        totalDepartments: Array.isArray(departments) ? departments.length : (departments?.total || 0),
        byDepartment: Object.entries(byDepartment).map(([name, count]) => ({ name, count })),
        byStatus,
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message, data: null });
  }
});

/**
 * GET /api/analytics/cross-system
 * 跨系统数据关联分析
 */
router.get('/cross-system', async (req, res) => {
  try {
    const ssoToken = getSsoToken(req);

    const [hrmsEmps, scmOrders, mdmDashboard] = await Promise.allSettled([
      hrmsApi(ssoToken, '/api/employees?pageSize=1'),
      scmApi(ssoToken, '/api/sales/orders?pageSize=50'),
      mdmApi(ssoToken, '/api/dashboard'),
    ]);

    const empCount = hrmsEmps.status === 'fulfilled' ? (hrmsEmps.value?.total || 0) : 0;
    const orders = scmOrders.status === 'fulfilled' ? (scmOrders.value?.list || []) : [];
    const mdm = mdmDashboard.status === 'fulfilled' ? mdmDashboard.value : {};

    const salesPerEmployee = empCount > 0 ? orders.length / empCount : 0;

    res.json({
      success: true,
      data: {
        employeeCount: empCount,
        orderCount: orders.length,
        totalSalesAmount: orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0),
        salesPerEmployee: Math.round(salesPerEmployee * 10) / 10,
        mdmSyncRate: mdm?.scmSync ? 
          Math.round((mdm.scmSync.deptMappings + mdm.scmSync.empMappings) / 
            Math.max(1, (mdm.masterData?.departments || 0) + (mdm.masterData?.employees || 0)) * 100) : 0,
        systemHealth: {
          hrms: hrmsEmps.status === 'fulfilled',
          scm: scmOrders.status === 'fulfilled',
          mdm: mdmDashboard.status === 'fulfilled',
        },
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message, data: null });
  }
});

export default router;
