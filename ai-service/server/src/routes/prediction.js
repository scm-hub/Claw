import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { scmApi, getSsoToken } from '../services/api-clients.js';
import { analyzeSalesTrend, generateReorderSuggestions, predictStockout, linearTrend } from '../services/prediction-engine.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/prediction/sales
 * 销售趋势预测
 */
router.get('/sales', async (req, res) => {
  try {
    const ssoToken = getSsoToken(req);

    // 获取历史订单数据
    const ordersData = await scmApi(ssoToken, '/api/sales/orders?pageSize=200');
    const orders = ordersData?.list || [];

    const analysis = analyzeSalesTrend(orders);

    const trendLabel = {
      rising: '📈 上升趋势',
      declining: '📉 下降趋势',
      stable: '➡️ 平稳趋势',
      'no-data': '无数据',
    };

    res.json({
      success: true,
      data: {
        ...analysis,
        trendLabel: trendLabel[analysis.trend],
        totalOrders: orders.length,
        totalAmount: orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
        prediction: analysis.prediction,
        predictionLabels: ['下一期', '下两期', '下三期'],
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message, data: { trend: 'no-data', prediction: [0, 0, 0] } });
  }
});

/**
 * GET /api/prediction/inventory
 * 库存预测与补货建议
 */
router.get('/inventory', async (req, res) => {
  try {
    const ssoToken = getSsoToken(req);

    // 获取库存数据
    const inventoryData = await scmApi(ssoToken, '/api/wms/inventory?pageSize=200');
    const items = inventoryData?.list || [];

    // 生成补货建议
    const suggestions = generateReorderSuggestions(items);

    // 库存分布统计
    const distribution = {
      critical: items.filter(i => (i.availableQty ?? i.qty) <= 10).length,
      low: items.filter(i => {
        const a = i.availableQty ?? i.qty;
        return a > 10 && a <= 30;
      }).length,
      medium: items.filter(i => {
        const a = i.availableQty ?? i.qty;
        return a > 30 && a <= 100;
      }).length,
      healthy: items.filter(i => (i.availableQty ?? i.qty) > 100).length,
    };

    res.json({
      success: true,
      data: {
        totalSKUs: items.length,
        distribution,
        suggestions,
        summary: {
          urgent: suggestions.filter(s => s.priority === 'urgent').length,
          recommended: suggestions.filter(s => s.priority === 'recommended').length,
        },
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message, data: { suggestions: [], distribution: {} } });
  }
});

/**
 * GET /api/prediction/dashboard
 * 预测仪表盘 — 汇总销售 + 库存预测
 */
router.get('/dashboard', async (req, res) => {
  try {
    const ssoToken = getSsoToken(req);

    const [ordersData, inventoryData, statsData] = await Promise.allSettled([
      scmApi(ssoToken, '/api/sales/orders?pageSize=200'),
      scmApi(ssoToken, '/api/wms/inventory?pageSize=200'),
      scmApi(ssoToken, '/api/wms/inventory/stats'),
    ]);

    const orders = ordersData.status === 'fulfilled' ? (ordersData.value?.list || []) : [];
    const inventory = inventoryData.status === 'fulfilled' ? (inventoryData.value?.list || []) : [];
    const stats = statsData.status === 'fulfilled' ? statsData.value : {};

    const salesAnalysis = analyzeSalesTrend(orders);
    const reorderSuggestions = generateReorderSuggestions(inventory);

    res.json({
      success: true,
      data: {
        sales: {
          trend: salesAnalysis.trend,
          trendLabel: { rising: '📈 上升', declining: '📉 下降', stable: '➡️ 平稳', 'no-data': '无数据' }[salesAnalysis.trend],
          growthRate: salesAnalysis.growthRate,
          dailyAvg: salesAnalysis.dailyAvg,
          prediction: salesAnalysis.prediction,
          totalOrders: orders.length,
          totalAmount: orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
        },
        inventory: {
          totalSKUs: stats.totalSKUs || inventory.length,
          lowStock: stats.lowStock || 0,
          totalBatches: stats.totalBatches || 0,
          reorderCount: reorderSuggestions.length,
          urgentCount: reorderSuggestions.filter(s => s.priority === 'urgent').length,
          suggestions: reorderSuggestions.slice(0, 10),
        },
        insights: generateInsights(salesAnalysis, reorderSuggestions, stats),
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message, data: null });
  }
});

/**
 * 生成智能洞察
 */
function generateInsights(salesAnalysis, reorderSuggestions, stats) {
  const insights = [];

  // 销售洞察
  if (salesAnalysis.trend === 'rising') {
    insights.push({
      type: 'positive',
      icon: '📈',
      title: '销售趋势向好',
      detail: `近期销售呈上升趋势，增长率 ${salesAnalysis.growthRate}%，日均销售额 ¥${salesAnalysis.dailyAvg.toLocaleString()}`,
    });
  } else if (salesAnalysis.trend === 'declining') {
    insights.push({
      type: 'warning',
      icon: '📉',
      title: '销售趋势下滑',
      detail: `近期销售呈下降趋势，下降率 ${Math.abs(salesAnalysis.growthRate)}%，建议关注市场变化`,
    });
  }

  // 库存洞察
  const urgentCount = reorderSuggestions.filter(s => s.priority === 'urgent').length;
  if (urgentCount > 0) {
    insights.push({
      type: 'critical',
      icon: '🔴',
      title: `${urgentCount} 个商品急需补货`,
      detail: `有 ${urgentCount} 个商品库存严重不足，建议立即安排采购`,
    });
  }

  if (stats.lowStock > 0) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: `${stats.lowStock} 个低库存预警`,
      detail: `当前有 ${stats.lowStock} 个SKU库存偏低，请关注补货时机`,
    });
  }

  // 预测洞察
  if (salesAnalysis.prediction && salesAnalysis.prediction[0] > salesAnalysis.dailyAvg * 1.1) {
    insights.push({
      type: 'info',
      icon: '🔮',
      title: '销售预测增长',
      detail: `预测下一期销售额可能达到 ¥${salesAnalysis.prediction[0].toLocaleString()}，建议提前备货`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'positive',
      icon: '✅',
      title: '一切正常',
      detail: '当前各项指标正常，无紧急事项',
    });
  }

  return insights;
}

export default router;
